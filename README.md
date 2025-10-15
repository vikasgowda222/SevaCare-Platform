# 🏥 Medi-Connect

**Medi-Connect** is a comprehensive online doctor appointment booking and consultation platform that bridges the gap between patients and healthcare providers. The platform offers seamless appointment scheduling, secure video consultations, and integrated health monitoring capabilities.

## ✨ Features

### 👥 For Patients

- **User Registration & Authentication** - Secure signup/login with JWT authentication
- **Doctor Discovery** - Browse and search doctors by specialty, location, and availability
- **Appointment Booking** - Easy-to-use booking system with real-time availability
- **Video Consultations** - High-quality video calls with doctors using WebRTC
- **Appointment Management** - View, reschedule, or cancel appointments
- **Profile Management** - Update personal information and medical history
- **Payment Integration** - Secure payments via Razorpay and Stripe
- **Health Monitoring** - Integration with pulse oximeter for real-time health data

### 👨‍⚕️ For Doctors

- **Professional Profiles** - Comprehensive doctor profiles with specializations
- **Schedule Management** - Set availability and manage appointment slots
- **Patient Consultations** - Conduct video consultations with patients
- **Appointment Dashboard** - View and manage all appointments
- **Patient Records** - Access patient history and consultation notes

### 🔧 For Administrators

- **User Management** - Manage patients and doctors
- **Appointment Oversight** - Monitor all platform appointments
- **Analytics Dashboard** - Track platform usage and performance
- **Content Management** - Manage platform content and settings

### 🎥 Video Consultation Features

- **Real-time Video Calls** - HD video quality with WebRTC
- **Audio Controls** - Mute/unmute microphone
- **Video Controls** - Turn camera on/off
- **Screen Sharing** - Share screen during consultations
- **Meeting Links** - Generate and share meeting links
- **Mobile Responsive** - Works seamlessly on all devices

## 🛠️ Tech Stack

### Frontend

- **React 19** - Modern React with latest features
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and development server
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - Beautiful and accessible UI components
- **React Router** - Client-side routing
- **React Hook Form** - Form handling and validation
- **Axios** - HTTP client for API calls
- **Lucide React** - Beautiful icons

### Backend

- **Node.js** - JavaScript runtime
- **Express.js** - Web application framework
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB object modeling
- **JWT** - JSON Web Tokens for authentication
- **bcrypt** - Password hashing
- **Cloudinary** - Image and video management
- **Razorpay & Stripe** - Payment processing
- **Multer** - File upload handling

### Hardware Integration

- **Arduino** - Pulse oximeter integration
- **ESP32/Arduino Uno** - Microcontroller for health sensors
- **Pulse Oximeter Sensor** - Real-time health monitoring

## 📁 Project Structure

```
Medi-Connect/
├── 🖥️ frontend/
│   ├── 📁 src/
│   │   ├── 🧩 components/
│   │   │   ├── 🎨 ui/          # shadcn/ui components
│   │   │   ├── 📄 layout/      # Page layouts
│   │   │   │   ├── 👥 Patient/ # Patient-specific pages
│   │   │   │   ├── 👨‍💼 Admin/   # Admin/Doctor dashboard
│   │   │   │   └── 🎥 Meet/    # Video consultation
│   │   │   └── 🔗 common/      # Shared components
│   │   ├── 🪝 hooks/           # Custom React hooks
│   │   ├── 📚 lib/             # Utility functions
│   │   ├── 🌐 context/         # React context providers
│   │   └── 🖼️ assets/          # Static assets
│   ├── 📦 package.json
│   └── ⚙️ vite.config.ts
├── 🔧 backend/
│   ├── 🎮 controllers/         # Route controllers
│   ├── 🗃️ models/              # Database models
│   ├── 🛣️ routes/              # API routes
│   ├── 🔒 middleware/          # Custom middleware
│   ├── ⚙️ config/              # Configuration files
│   ├── 🚀 server.js
│   └── 📦 package.json
└── 🔌 pulseoximeter/           # Arduino code for NodeMCU
    ├── 📟 pulseoximeter.ino
    └── 🔧 filters.h
```

## 🚀 Getting Started

### Prerequisites

Before running this project, make sure you have the following installed:

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **MongoDB** (local installation or MongoDB Atlas)
- **Git**

### Environment Variables

Create `.env` files in both frontend and backend directories:

#### Backend `.env`

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/mediconnect
JWT_SECRET=your_jwt_secret_key
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
STRIPE_SECRET_KEY=your_stripe_secret_key
```

#### Frontend `.env`

```env
VITE_API_URL=http://localhost:5000
VITE_RAZORPAY_KEY_ID=your_razorpay_key_id
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
```

### Installation & Setup

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/medi-connect.git
   cd medi-connect
   ```

2. **Setup Backend**

   ```bash
   cd backend
   npm i
   npm run server
   ```

   The backend server will start on `http://localhost:5000`

3. **Setup Frontend** (in a new terminal)

   ```bash
   cd frontend
   npm i
   npm run dev
   ```

   The frontend will start on `http://localhost:5173`

4. **Setup Database**
   - Install MongoDB locally or use MongoDB Atlas
   - The application will automatically create the required collections

5. **Setup Payment Gateways** (Optional)
   - Create accounts on Razorpay and Stripe
   - Add your API keys to the environment variables

### Hardware Setup (Optional)

For pulse oximeter integration:

1. **Hardware Requirements**
   - Arduino Uno or ESP32
   - MAX30102 Pulse Oximeter Sensor
   - Jumper wires and breadboard

2. **Arduino Setup**

   ```bash
   cd pulseoximeter
   # Upload pulseoximeter.ino to your Arduino board using Arduino IDE
   ```

3. **Connect the sensor**
   - VCC → 3.3V
   - GND → GND
   - SDA → A4 (Arduino Uno) / GPIO21 (ESP32)
   - SCL → A5 (Arduino Uno) / GPIO22 (ESP32)

## 📱 Usage

### For Patients

1. **Registration**
   - Visit the homepage and click "Sign Up"
   - Fill in your personal details
   - Verify your email address

2. **Book an Appointment**
   - Browse available doctors
   - Select a doctor and available time slot
   - Make payment and confirm booking

3. **Join Video Consultation**
   - Go to "My Appointments"
   - Click "Join Meeting" when it's time
   - Allow camera and microphone permissions

### For Doctors

1. **Profile Setup**
   - Complete your professional profile
   - Set your availability and consultation fees
   - Upload necessary documents

2. **Manage Appointments**
   - View upcoming appointments in dashboard
   - Join video consultations with patients
   - Update patient records after consultation

### For Administrators

1. **Access Admin Panel**
   - Login with admin credentials
   - Monitor platform activities
   - Manage users and content

## 🔧 API Endpoints

### Authentication

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout

### Appointments

- `GET /api/appointments` - Get user appointments
- `POST /api/appointments` - Book new appointment
- `PUT /api/appointments/:id` - Update appointment
- `DELETE /api/appointments/:id` - Cancel appointment

### Doctors

- `GET /api/doctors` - Get all doctors
- `GET /api/doctors/:id` - Get doctor details
- `PUT /api/doctors/:id` - Update doctor profile

### Payments

- `POST /api/payments/razorpay` - Create Razorpay order
- `POST /api/payments/stripe` - Process Stripe payment

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 🆘 Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/yourusername/medi-connect/issues) page
2. Create a new issue if your problem isn't already reported
3. Provide detailed information about the problem

## 🙏 Acknowledgments

- [shadcn/ui](https://ui.shadcn.com/) for the beautiful UI components
- [Radix UI](https://www.radix-ui.com/) for accessible primitives
- [Tailwind CSS](https://tailwindcss.com/) for styling
- [React](https://reactjs.org/) for the frontend framework
- [Express.js](https://expressjs.com/) for the backend framework

---

**Made with ❤️ for better healthcare accessibility**
