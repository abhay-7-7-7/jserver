import '@testing-library/jest-dom';

// Polyfill ResizeObserver for Recharts tests in jsdom
(globalThis as any).ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

