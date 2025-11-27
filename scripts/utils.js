const root = typeof globalThis !== 'undefined'
  ? globalThis
  : (typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : {}));

function createTokenFallback() {
  return String(Math.random()).slice(2) + Date.now();
}

function generateVerificationToken(bytes = 32) {
  if (root.crypto && typeof root.crypto.getRandomValues === 'function') {
    const arr = new Uint8Array(bytes);
    root.crypto.getRandomValues(arr);
    return Array.from(arr).map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  if (typeof require === 'function') {
    try {
      const nodeCrypto = require('crypto');
      return nodeCrypto.randomBytes(bytes).toString('hex');
    } catch {}
  }
  return createTokenFallback();
}

function isValidName(name) {
  const value = String(name || '').trim();
  if (value.length < 2) return false;
  if (/\d/.test(value)) return false;
  if (!/[\p{L}]/u.test(value)) return false;
  return /^[\p{L}\s'\-]+$/u.test(value);
}

function validatePassword(password = '') {
  const requirements = {
    length: password.length >= 8,
    number: /\d/.test(password),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
  };
  const satisfied = Object.values(requirements).filter(Boolean).length;
  return {
    requirements,
    strength: satisfied === 3 ? 'strong' : satisfied === 2 ? 'medium' : 'weak',
    isValid: satisfied === 3
  };
}

function buildVerificationLink(uid, token, baseUrl) {
  if (!uid || !token) return '';
  const base = baseUrl || (root.location && root.location.href) || 'http://localhost/';
  try {
    const url = new URL('./verify.html', base);
    url.searchParams.set('uid', String(uid));
    url.searchParams.set('token', String(token));
    return url.href;
  } catch {
    return '';
  }
}

const AuthUtils = {
  isValidName,
  validatePassword,
  generateVerificationToken,
  buildVerificationLink
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = AuthUtils;
}

if (root) {
  root.AuthUtils = Object.assign({}, root.AuthUtils, AuthUtils);
  Object.entries(AuthUtils).forEach(([key, fn]) => {
    root[key] = fn;
  });
}

