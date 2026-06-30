// @vitest-environment jsdom

import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { afterEach, describe, expect, it } from 'vitest';
import {
  calculateResizedImageFrame,
  TemplateImageNode,
} from './TemplateImageNode';

describe('TemplateImageNode', () => {
  let editor: Editor | null = null;

  afterEach(() => {
    editor?.destroy();
    editor = null;
  });

  it('markiert das gewählte Bild und stellt einen Resize-Griff bereit', () => {
    const element = document.createElement('div');
    document.body.append(element);
    editor = new Editor({
      element,
      extensions: [StarterKit, TemplateImageNode],
      content: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Vorher' }],
          },
          {
            type: 'templateImage',
            attrs: {
              src: 'data:image/png;base64,AA==',
              alt: 'Testbild',
              width: 160,
              height: 80,
            },
          },
        ],
      },
    });

    const wrapper = element.querySelector('.document-template-image-wrapper');
    const handles = element.querySelectorAll(
      '.document-template-image-resize-handle'
    );
    expect(wrapper?.classList.contains('ProseMirror-selectednode')).toBe(false);
    wrapper?.dispatchEvent(new Event('pointerenter'));
    expect(handles[0]?.getAttribute('style')).toContain('opacity: 1');
    wrapper?.dispatchEvent(new Event('pointerleave'));
    expect(handles[0]?.getAttribute('style')).toContain('opacity: 0');

    wrapper?.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(wrapper?.classList.contains('ProseMirror-selectednode')).toBe(true);
    expect(handles).toHaveLength(8);
    expect(handles[0]?.getAttribute('aria-label')).toContain('Bildgröße');
    expect(handles[0]?.getAttribute('style')).toContain('opacity: 1');

    element.remove();
  });

  it('ändert über Kantengriffe nur eine Dimension', () => {
    expect(
      calculateResizedImageFrame({
        direction: 'e',
        deltaX: 40,
        deltaY: 100,
        preserveAspectRatio: false,
        originFrame: { x: 100, y: 100, width: 160, height: 80 },
        bounds: { width: 500, height: 500 },
      })
    ).toEqual({ x: 100, y: 100, width: 200, height: 80 });
  });

  it('behält mit Shift das Seitenverhältnis bei', () => {
    expect(
      calculateResizedImageFrame({
        direction: 'se',
        deltaX: 40,
        deltaY: 0,
        preserveAspectRatio: true,
        originFrame: { x: 100, y: 100, width: 160, height: 80 },
        bounds: { width: 500, height: 500 },
      })
    ).toEqual({ x: 100, y: 100, width: 200, height: 100 });
  });

  it('hält beim Ziehen links oben die gegenüberliegenden Kanten fest', () => {
    expect(
      calculateResizedImageFrame({
        direction: 'nw',
        deltaX: 20,
        deltaY: 10,
        preserveAspectRatio: false,
        originFrame: { x: 100, y: 100, width: 160, height: 80 },
        bounds: { width: 500, height: 500 },
      })
    ).toEqual({ x: 120, y: 110, width: 140, height: 70 });
  });
});
