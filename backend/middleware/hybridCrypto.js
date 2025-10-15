import { DiffieHellman, encrypt, decrypt } from '../utils/crypto.js';

// Store active DH instances for each session
const dhSessions = new Map();

// Middleware to optionally handle Diffie-Hellman key exchange
const optionalDiffieHellman = (req, res, next) => {
  const sessionId = req.headers['session-id'];
  
  // Only initialize if session-id is provided
  if (sessionId) {
    if (!dhSessions.has(sessionId)) {
      const dh = new DiffieHellman();
      dhSessions.set(sessionId, dh);
      console.log(`🔑 Created new DH session: ${sessionId}`);
    }
    req.dh = dhSessions.get(sessionId);
    console.log(`🔑 Using DH session: ${sessionId}`);
  }
  
  next();
};

// Middleware to optionally decrypt incoming requests
const optionalDecryptRequest = (req, res, next) => {
  // Check if this is an encrypted request
  if (req.body && req.body.encrypted && req.body.clientPublicKey) {
    try {
      const sessionId = req.headers['session-id'];
      console.log(`🔓 Attempting decryption for session: ${sessionId}`);
      console.log(`🔓 Client public key: ${req.body.clientPublicKey}`);
      
      if (!sessionId) {
        console.error('❌ No session ID provided for encrypted request');
        return res.status(400).json({ success: false, message: 'Session ID required for encrypted requests' });
      }

      const dh = dhSessions.get(sessionId);
      
      if (!dh) {
        console.error(`❌ No DH session found for: ${sessionId}`);
        return res.status(400).json({ success: false, message: 'Session not found' });
      }

      console.log(`🔓 Server public key: ${dh.getPublicKey()}`);
      const sharedSecret = dh.generateSharedSecret(req.body.clientPublicKey);
      console.log(`🔓 Generated shared secret: ${sharedSecret}`);
      console.log(`🔓 Encrypted data: ${req.body.encrypted.substring(0, 50)}...`);
      
      const decryptedData = decrypt(req.body.encrypted, sharedSecret);
      console.log(`🔓 Decrypted data:`, decryptedData);
      
      // Extract headers from decrypted data and set them to req.headers
      if (decryptedData && decryptedData.headers) {
        // Merge encrypted headers with existing headers (encrypted headers take precedence)
        Object.assign(req.headers, decryptedData.headers);
        console.log('🔓 Headers extracted from encrypted request:', decryptedData.headers);
        
        // Remove headers from body to avoid confusion
        delete decryptedData.headers;
      }
      
      // Replace the body with decrypted data
      req.body = decryptedData;
      req.sharedSecret = sharedSecret;
      req.isEncrypted = true;
      
      console.log('🔓 Request decrypted successfully');
    } catch (error) {
      console.error('❌ Decryption error:', error);
      console.error('❌ Request body:', JSON.stringify(req.body, null, 2));
      return res.status(400).json({ success: false, message: 'Decryption failed' });
    }
  } else {
    // Regular non-encrypted request
    req.isEncrypted = false;
    console.log('📡 Regular (non-encrypted) request');
  }
  
  next();
};

// Middleware to optionally encrypt outgoing responses
const optionalEncryptResponse = (req, res, next) => {
  const originalJson = res.json;
  
  res.json = function(data) {
    // Only encrypt if the request was encrypted
    if (req.isEncrypted && req.sharedSecret && data && typeof data === 'object') {
      const encrypted = encrypt(data, req.sharedSecret);
      console.log('🔐 Response encrypted successfully');
      return originalJson.call(this, { encrypted, success: true });
    }
    
    // Return regular response
    console.log('📡 Regular (non-encrypted) response');
    return originalJson.call(this, data);
  };
  
  next();
};

// Combined middleware for easy use
const hybridCrypto = (req, res, next) => {
  optionalDiffieHellman(req, res, () => {
    optionalDecryptRequest(req, res, () => {
      optionalEncryptResponse(req, res, next);
    });
  });
};

export { 
  optionalDiffieHellman, 
  optionalDecryptRequest, 
  optionalEncryptResponse, 
  hybridCrypto 
}; 