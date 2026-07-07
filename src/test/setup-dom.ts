import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

if (
  typeof document !== 'undefined' &&
  typeof document.elementFromPoint !== 'function'
) {
  document.elementFromPoint = () => null;
}

afterEach(() => {
  if (typeof document !== 'undefined') {
    cleanup();
  }
});
