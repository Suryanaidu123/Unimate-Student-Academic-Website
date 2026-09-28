const jwt = require('jsonwebtoken');
const env = require('../config/env');

function signAccess(payload) {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: '1d' });
}
function signRefresh(payload) {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
}
function verifyAccess(token) {
  return jwt.verify(token, env.JWT_SECRET);
}
function verifyRefresh(token) {
  return jwt.verify(token, env.JWT_REFRESH_SECRET);
}
module.exports = { signAccess, signRefresh, verifyAccess, verifyRefresh };