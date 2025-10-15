import jwt from 'jsonwebtoken';

// admin authentication middleware
const authAdmin = async (req, res, next) => {
  try {
    console.log('🔍 AuthAdmin: Headers received:', req.headers);
    // Check for both camelCase and lowercase versions
    const aToken = req.headers.aToken || req.headers.atoken;
    console.log('🔍 AuthAdmin: aToken extracted:', aToken ? 'Present' : 'Missing');
    
    if (!aToken) {
      console.log('❌ AuthAdmin: No aToken provided');
      return res.json({ success: false, message: 'Not Authorized Login Again' });
    }
    
    const token_decode = jwt.verify(aToken, process.env.JWT_SECRET);
    console.log('🔍 AuthAdmin: Token decoded:', token_decode);
    console.log('🔍 AuthAdmin: Expected:', process.env.ADMIN_EMAIL + process.env.ADMIN_PASSWORD);
    
    if (token_decode !== process.env.ADMIN_EMAIL + process.env.ADMIN_PASSWORD) {
      console.log('❌ AuthAdmin: Token does not match expected value');
      return res.json({ success: false, message: 'Not Authorized Login Again' });
    }
    
    console.log('✅ AuthAdmin: Authentication successful');
    next();
  } catch (error) {
    console.log('❌ AuthAdmin: JWT verification failed:', error.message);
    res.json({ success: false, message: error.message });
  }
};

export default authAdmin;
