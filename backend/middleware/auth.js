/* eslint-env node */
const jwt = require('jsonwebtoken');

const APP_JWT_SECRET = process.env.APP_JWT_SECRET || 'dev-secret-change-me';

function signAppToken(payload, opts = {}) {
  return jwt.sign(payload, APP_JWT_SECRET, { expiresIn: '7d', ...opts });
}

function verifyAppToken(token) {
  try {
    return jwt.verify(token, APP_JWT_SECRET);
  } catch (e) {
    return null;
  }
}

function extractToken(req) {
  const auth = req.headers.authorization || '';
  if (auth.startsWith('Bearer ')) return auth.slice(7);
  if (req.cookies && req.cookies.auth_token) return req.cookies.auth_token;
  return null;
}

function requireAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const claims = verifyAppToken(token);
  if (!claims) return res.status(401).json({ error: 'Invalid token' });
  req.user = { id: claims.sub, email: claims.email, role: claims.role || 'patient' };
  next();
}

module.exports = { requireAuth, signAppToken, verifyAppToken };
