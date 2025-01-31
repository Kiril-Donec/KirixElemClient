const originalConsoleError = console.error;

console.error = (...args: any[]) => {
  if (args[0]?.includes?.('Warning: Encountered two children with the same key')) {
    return;
  }
  originalConsoleError.apply(console, args);
};
