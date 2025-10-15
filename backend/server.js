import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { createServer } from 'http';
import { Server } from 'socket.io';
import connectDB from './config/mongodb.js';
import connectCloudinary from './config/cloudinary.js';
import userRouter from './routes/userRoute.js';
import doctorRouter from './routes/doctorRoute.js';
import adminRouter from './routes/adminRoute.js';
import secureRouter from './routes/secureRoute.js';
import { optionalDecryptRequest, optionalEncryptResponse } from './middleware/hybridCrypto.js';

// app config
const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});
const port = process.env.PORT || 4000;
connectDB();
connectCloudinary();

// middlewares
app.use(express.json());
app.use(cors());

let latestRealVitals = null;
let lastUpdatedTime = Date.now();

// Toggle mock data on/off
const MOCK_ENABLED = true; // set to true to enable mock data

// Generate realistic looking vital signs
const generateRealisticVitals = () => {
  // if real vitals exist and are recent, return them
  if (latestRealVitals && Date.now() - lastUpdatedTime < 30000) {
    return latestRealVitals;
  }
  // otherwise generate mock
  const baseHeartRate = 82;
  const baseSpo2 = 98;
  const heartRateVariation = Math.floor(Math.random() * 8) - 3;
  const spo2Variation = Math.floor(Math.random() * 3) - 1;
  return {
    bpm: Math.max(60, Math.min(100, baseHeartRate + heartRateVariation)).toString(),
    spo2: Math.max(95, Math.min(100, baseSpo2 + spo2Variation)).toString(),
    timestamp: Date.now()
  };
};

// api endpoints
app.use('/api/user', userRouter);
app.use('/api/admin', adminRouter);
app.use('/api/doctor', doctorRouter);
app.use('/api/secure', secureRouter);

app.get('/', (req, res) => {
  res.send('API Working');
});

// Receive vitals
app.post('/data', (req, res) => {
  try {
    let { bpm, spo2 } = req.body;
    if (!bpm || !spo2) {
      throw new Error('Missing required fields: bpm and spo2');
    }
    spo2 = Math.max(0, Math.min(100, Number(spo2)));

    console.log(`📥 Data received - BPM: ${bpm}, SpO2: ${spo2}`);
    latestRealVitals = { bpm, spo2, timestamp: Date.now() };
    lastUpdatedTime = Date.now();
    res.status(200).json({ success: true, message: 'Data received successfully' });
  } catch (error) {
    console.error('Error processing vitals data:', error.message);
    res.status(400).json({ success: false, message: error.message });
  }
});

// Endpoint to get the latest vitals (with encryption support)
app.get('/api/vitals/latest', optionalDecryptRequest, (req, res, next) => {
  let vitals;
  if (MOCK_ENABLED) {
    vitals = generateRealisticVitals();
  } else if (latestRealVitals) {
    vitals = latestRealVitals;
  } else {
    return res.status(404).json({ success: false, message: 'No vitals data available' });
  }
  res.json({ success: true, ...vitals });
}, optionalEncryptResponse);

// Support POST for encrypted requests
app.post('/api/vitals/latest', optionalDecryptRequest, (req, res, next) => {
  let vitals;
  if (MOCK_ENABLED) {
    vitals = generateRealisticVitals();
  } else if (latestRealVitals) {
    vitals = latestRealVitals;
  } else {
    return res.status(404).json({ success: false, message: 'No vitals data available' });
  }
  res.json({ success: true, ...vitals });
}, optionalEncryptResponse);

// Socket.IO for real-time meeting functionality
const activeRooms = new Map(); // Store active meeting rooms

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Join a meeting room
  socket.on('join-room', ({ roomId, userName }) => {
    socket.join(roomId);
    
    // Initialize room if it doesn't exist
    if (!activeRooms.has(roomId)) {
      activeRooms.set(roomId, new Set());
    }
    
    // Add user to room
    const roomUsers = activeRooms.get(roomId);
    const userInfo = { id: socket.id, name: userName };
    roomUsers.add(JSON.stringify(userInfo));
    
    console.log(`${userName} joined room ${roomId}`);
    
    // Notify others in the room that a new user joined
    socket.to(roomId).emit('user-joined', { userId: socket.id, userName });
    
    // Send list of existing users to the new user
    const existingUsers = Array.from(roomUsers)
      .map(userStr => JSON.parse(userStr))
      .filter(user => user.id !== socket.id);
    
    socket.emit('existing-users', existingUsers);
  });

  // Handle WebRTC signaling
  socket.on('webrtc-offer', ({ offer, targetUserId, roomId }) => {
    socket.to(targetUserId).emit('webrtc-offer', { 
      offer, 
      offerUserId: socket.id,
      roomId 
    });
  });

  socket.on('webrtc-answer', ({ answer, targetUserId, roomId }) => {
    socket.to(targetUserId).emit('webrtc-answer', { 
      answer, 
      answerUserId: socket.id,
      roomId 
    });
  });

  socket.on('webrtc-ice-candidate', ({ candidate, targetUserId, roomId }) => {
    socket.to(targetUserId).emit('webrtc-ice-candidate', { 
      candidate, 
      candidateUserId: socket.id,
      roomId 
    });
  });

  // Handle user leaving
  socket.on('leave-room', ({ roomId, userName }) => {
    socket.leave(roomId);
    
    if (activeRooms.has(roomId)) {
      const roomUsers = activeRooms.get(roomId);
      // Remove user from room
      for (const userStr of roomUsers) {
        const user = JSON.parse(userStr);
        if (user.id === socket.id) {
          roomUsers.delete(userStr);
          break;
        }
      }
      
      // If room is empty, delete it
      if (roomUsers.size === 0) {
        activeRooms.delete(roomId);
      }
    }
    
    console.log(`${userName} left room ${roomId}`);
    socket.to(roomId).emit('user-left', { userId: socket.id, userName });
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    
    // Remove user from all rooms
    for (const [roomId, roomUsers] of activeRooms.entries()) {
      for (const userStr of roomUsers) {
        const user = JSON.parse(userStr);
        if (user.id === socket.id) {
          roomUsers.delete(userStr);
          socket.to(roomId).emit('user-left', { userId: socket.id, userName: user.name });
          break;
        }
      }
      
      // If room is empty, delete it
      if (roomUsers.size === 0) {
        activeRooms.delete(roomId);
      }
    }
  });
});

server.listen(port, () => console.log(`Server started on PORT:${port}`));
