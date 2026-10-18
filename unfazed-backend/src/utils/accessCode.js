const crypto = require('crypto');

const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateAccessCode(length = 8) {
  const bytes = crypto.randomBytes(length);
  let code = '';
  for (let i = 0; i < length; i += 1) code += alphabet[bytes[i] % alphabet.length];
  return code;
}

module.exports = { generateAccessCode };
