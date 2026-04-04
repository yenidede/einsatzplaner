/**
 * @vitest-environment jsdom
 */

// TODO: Remove later, keep just for demo purposes. This is not a real test, just to show how to use vitest and to have some coverage for the token generation function.

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Button } from './button';

describe('Button', () => {
  it('renders its label', () => {
    render(<Button>Test button</Button>);

    expect(screen.getByRole('button', { name: 'Test button' })).toBeTruthy();
  });
});
