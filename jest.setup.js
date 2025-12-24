import '@testing-library/jest-dom';

// Polyfill for setImmediate (used by winston)
if (typeof setImmediate === 'undefined') {
  global.setImmediate = (fn, ...args) => {
    return setTimeout(fn, 0, ...args);
  };
  global.clearImmediate = clearTimeout;
}

// Polyfill for fetch (needed for integration tests)
if (typeof global.fetch === 'undefined') {
  try {
    global.fetch = require('node-fetch');
  } catch (e) {
    // node-fetch not installed, skip
    console.warn('node-fetch not available, fetch will not work in tests');
  }
}
