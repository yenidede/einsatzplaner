import { describe, expect, it } from 'vitest';
import { resolveTemplateImageLayout } from './document-template-image-layout';

describe('Bildlayout', () => {
  it('verwendet für neue oder alte Bilder ohne Layout einen sicheren Block', () => {
    expect(resolveTemplateImageLayout(undefined)).toBe('block');
    expect(resolveTemplateImageLayout({ mode: 'inline', align: 'left' })).toBe(
      'block'
    );
  });

  it('übernimmt alle neuen Layoutmodi unverändert', () => {
    expect(resolveTemplateImageLayout({ layout: 'inline' })).toBe('inline');
    expect(resolveTemplateImageLayout({ layout: 'float-left' })).toBe(
      'float-left'
    );
    expect(resolveTemplateImageLayout({ layout: 'float-right' })).toBe(
      'float-right'
    );
    expect(resolveTemplateImageLayout({ layout: 'center' })).toBe('center');
    expect(resolveTemplateImageLayout({ layout: 'absolute' })).toBe('absolute');
  });

  it('hält frei positionierte und zentrierte Altbilder kompatibel', () => {
    expect(resolveTemplateImageLayout({ mode: 'free' })).toBe('absolute');
    expect(
      resolveTemplateImageLayout({ mode: 'inline', align: 'center' })
    ).toBe('center');
  });
});
