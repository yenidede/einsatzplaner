import { describe, expect, it } from 'vitest';
import { isPublicPath } from './public-paths';

describe('isPublicPath', () => {
  it('behandelt /signup als öffentliche Route', () => {
    expect(isPublicPath('/signup')).toBe(true);
    expect(isPublicPath('/signup/')).toBe(true);
  });

  it('behandelt weitere Auth- und Invite-Routen als öffentlich', () => {
    expect(isPublicPath('/signin')).toBe(true);
    expect(isPublicPath('/forgot-password')).toBe(true);
    expect(isPublicPath('/reset-password')).toBe(true);
    expect(isPublicPath('/invite/token-123')).toBe(true);
  });

  it('behandelt Anwendungsrouten weiterhin als geschützt', () => {
    expect(isPublicPath('/')).toBe(false);
    expect(isPublicPath('/einsatzverwaltung')).toBe(false);
    expect(isPublicPath('/helferansicht')).toBe(false);
  });
});
