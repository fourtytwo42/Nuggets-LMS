import '@testing-library/jest-dom';

// Polyfill for setImmediate (used by winston)
if (typeof setImmediate === 'undefined') {
  global.setImmediate = (fn, ...args) => {
    return setTimeout(fn, 0, ...args);
  };
  global.clearImmediate = clearTimeout;
}
