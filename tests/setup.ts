// Test setup file
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Mock console methods to avoid noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};

// Helper to create temporary directories for tests
export function createTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'api-tools-test-'));
}

// Helper to clean up temp directories
export function cleanupTempDir(dir: string): void {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// Reset modules between tests
beforeEach(() => {
  jest.clearAllMocks();
  jest.resetModules();
});

// Increase timeout for CI environments
if (process.env.CI) {
  jest.setTimeout(30000);
}