// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './dropdown-menu';

describe('DropdownMenuItem', () => {
  it('applies the destructive styling variant', () => {
    render(
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger>Menü</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem variant="destructive">Entfernen</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );

    const item = screen.getByText('Entfernen');

    expect(item.className).toContain('data-[variant=destructive]:text-destructive');
    expect(item.className).toContain(
      'data-[variant=destructive]:focus:bg-destructive/10'
    );
  });
});
