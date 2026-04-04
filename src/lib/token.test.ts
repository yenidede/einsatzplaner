import { describe, expect, it } from 'vitest';
import { generatedToken } from './token';

// TODO: Remove later, keep just for demo purposes. This is not a real test, just to show how to use vitest and to have some coverage for the token generation function.

describe('generatedToken', () => {
  it('returns a base64url token with the requested byte length', () => {
    const token = generatedToken(24);

    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(token.length).toBeGreaterThan(0);
  });
});
