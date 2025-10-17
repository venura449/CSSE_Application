import '@testing-library/jest-dom';
// Minimal ResizeObserver stub for libraries like Recharts in JSDOM
if (typeof global.ResizeObserver === 'undefined') {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

