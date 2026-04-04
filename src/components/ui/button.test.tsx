/**
 * @vitest-environment jsdom
 */

// TODO: Remove later if this demo test is no longer needed. It exists to show basic Vitest usage for the Button component.

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Button } from './button';

describe('Button', () => {
  it('renders its label', () => {
    render(<Button>Test button</Button>);

    expect(screen.getByRole('button', { name: 'Test button' })).toBeTruthy();
  });
});
