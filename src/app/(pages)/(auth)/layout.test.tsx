/**
 * @vitest-environment jsdom
 */

import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import AuthLayout from './layout';

describe('AuthLayout', () => {
  afterEach(() => {
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
  });

  it('rendert den Inhalt in einem viewport-begrenzten Wrapper', () => {
    const { container } = render(
      <AuthLayout>
        <div>Auth-Inhalt</div>
      </AuthLayout>
    );

    const layoutMain = container.querySelector('main');

    expect(screen.getByText('Auth-Inhalt')).toBeTruthy();
    expect(layoutMain?.className).toContain('h-dvh');
    expect(layoutMain?.className).toContain('overflow-hidden');
  });

  it('sperrt den Dokument-Scroll für Auth-Seiten', async () => {
    render(
      <AuthLayout>
        <div>Auth-Inhalt</div>
      </AuthLayout>
    );

    await waitFor(() => {
      expect(document.documentElement.style.overflow).toBe('hidden');
      expect(document.body.style.overflow).toBe('hidden');
    });
  });
});
