const { verifyAccessToken } = require('../config/jwt');

// Protects routes: expects "Authorization: Bearer <accessToken>"
function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Missing or malformed authorization header' });
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, email: payload.email, role: payload.role };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Access token expired' });
    }
    return res.status(401).json({ error: 'Invalid access token' });
  }
}

// Optional role guard, e.g. authorize('admin')
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: insufficient permissions' });
    }
    next();
  };
}

module.exports = { authenticate, authorize };
