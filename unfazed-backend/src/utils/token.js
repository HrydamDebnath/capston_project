const jwt = require('jsonwebtoken');

function secret() {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is not set');
  return process.env.JWT_SECRET;
}

function signToken(payload, expiresIn = '7d') {
  return jwt.sign(payload, secret(), { expiresIn });
}

function verifyToken(token) {
  return jwt.verify(token, secret());
}

module.exports = { signToken, verifyToken };
