import { DiffieHellman, encrypt, decrypt } from '../utils/crypto.js';

// Store active DH instances for each session
const dhSessions = new Map();

// Middleware to handle Diffie-Hellman key exchange
const initDiffieHellman = (req, res, next) => {
  const sessionId = req.headers['session-id'] || 'default';
  
  if (!dhSessions.has(sessionId)) {
    const dh = new DiffieHellman();
    dhSessions.set(sessionId, dh);
  }
  
  req.dh = dhSessions.get(sessionId);
  next();
};

// Middleware to decrypt incoming requests
const decryptRequest = (req, res, next) => {
  if (req.body && req.body.encrypted && req.body.clientPublicKey) {
    try {
      const sessionId = req.headers['session-id'] || 'default';
      const dh = dhSessions.get(sessionId);
      
      if (!dh) {
        return res.status(400).json({ success: false, message: 'Session not found' });
      }

      const sharedSecret = dh.generateSharedSecret(req.body.clientPublicKey);
      const decryptedData = decrypt(req.body.encrypted, sharedSecret);
      
      // Replace the body with decrypted data
      req.body = decryptedData;
      req.sharedSecret = sharedSecret;
    } catch (error) {
      console.error('Decryption error:', error);
      return res.status(400).json({ success: false, message: 'Decryption failed' });
    }
  }
  next();
};

// Middleware to encrypt outgoing responses
const encryptResponse = (req, res, next) => {
  const originalJson = res.json;
  
  res.json = function(data) {
    if (req.sharedSecret && data && typeof data === 'object') {
      const encrypted = encrypt(data, req.sharedSecret);
      return originalJson.call(this, { encrypted, success: true });
    }
    return originalJson.call(this, data);
  };
  
  next();
};

export { initDiffieHellman, decryptRequest, encryptResponse }; 