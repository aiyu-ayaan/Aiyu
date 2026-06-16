import { describe, it, expect, beforeEach } from 'vitest';
import { applyThemeColors } from './themeUtils';

describe('applyThemeColors', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('style');
  });

  it('no-ops when variantData is missing', () => {
    applyThemeColors('dark', null);
    expect(document.documentElement.getAttribute('style')).toBeNull();
  });

  it('sets background and text CSS custom properties', () => {
    applyThemeColors('dark', {
      backgrounds: {
        primary: '#000', secondary: '#111', tertiary: '#222',
        surface: '#333', elevated: '#444', hover: '#555',
      },
      text: {
        primary: '#fff', secondary: '#eee', tertiary: '#ddd',
        muted: '#ccc', bright: '#fafafa',
      },
    });
    const root = document.documentElement;
    expect(root.style.getPropertyValue('--bg-primary')).toBe('#000');
    expect(root.style.getPropertyValue('--bg-hover')).toBe('#555');
    expect(root.style.getPropertyValue('--text-bright')).toBe('#fafafa');
  });

  it('only sets the property groups that are present', () => {
    applyThemeColors('dark', { accents: { cyan: '#0ff', cyanBright: '#0ee' } });
    const root = document.documentElement;
    expect(root.style.getPropertyValue('--accent-cyan')).toBe('#0ff');
    expect(root.style.getPropertyValue('--bg-primary')).toBe('');
  });
});
