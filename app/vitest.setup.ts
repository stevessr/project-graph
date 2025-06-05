// vitest.setup.ts
import { vi } from "vitest";

global.URL.createObjectURL = vi.fn(() => "mock-blob-url");
global.URL.revokeObjectURL = vi.fn();

global.Worker = vi.fn().mockImplementation(() => {
  return {
    postMessage: vi.fn(),
    onmessage: null,
    onerror: null,
    terminate: vi.fn(),
  };
});
