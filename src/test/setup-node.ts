import { afterEach } from 'vitest';

afterEach(() => {
  process.env = { ...process.env };
});
