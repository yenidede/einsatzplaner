/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import AuthLayout from './layout';

describe('AuthLayout', () => {
  it('rendert den Inhalt in einem viewport-begrenzten Wrapper', () => {
    const { container } = render(
      <AuthLayout>
        <div>Auth-Inhalt</div>
      </AuthLayout>
    );

    const layoutMain = container.querySelector('main');

    expect(screen.getByText('Auth-Inhalt')).toBeTruthy();
    expect(layoutMain?.className).toContain('min-h-dvh');
  });
});
