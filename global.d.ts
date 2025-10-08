// ✅ Ensures this file is treated as a module
export {};

declare global {
  interface Window {
    fbq: (...args: any[]) => void;
    _fbq?: any;
    fbp?: string;
    fbc?: string;
  }
}
