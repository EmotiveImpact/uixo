import { describe, expect, it } from 'vitest';
import { CUSTOMISABLE_DEMOS, customisableDemo, sanitiseDemoProps } from '../../shared/demo-props';

describe('customisable demo props', () => {
  it('only covers the curated demos', () => {
    expect(Object.keys(CUSTOMISABLE_DEMOS).sort()).toEqual([
      'magic-ui/aurora-text',
      'magic-ui/retro-grid',
      'magic-ui/shimmer-button',
    ]);
    expect(customisableDemo('magic-ui/dock')).toBeUndefined();
    expect(customisableDemo('__proto__')).toBeUndefined();
    expect(sanitiseDemoProps('magic-ui/dock', {})).toBeNull();
  });

  it('keeps listed colours and clamps numbers to their range and step', () => {
    const values = sanitiseDemoProps('magic-ui/shimmer-button', {
      shimmerColor: '#c4b5fd',
      shimmerDuration: 99,
      borderRadius: 12.4,
      children: 'Go',
    });
    expect(values).toMatchObject({
      shimmerColor: '#c4b5fd',
      shimmerDuration: 6,
      borderRadius: 12,
      children: 'Go',
    });
  });

  it('drops anything not offered by a control', () => {
    const values = sanitiseDemoProps('magic-ui/shimmer-button', {
      shimmerColor: 'red; background: url(x)',
      background: { evil: true },
      shimmerDuration: Number.NaN,
      children: `a\u0000b${'x'.repeat(80)}`,
      onClick: 'alert(1)',
    });
    expect(values?.shimmerColor).toBe('#ffffff');
    expect(values?.background).toBe('#000000');
    expect(values?.shimmerDuration).toBe(3);
    expect(String(values?.children)).toHaveLength(28);
    expect(String(values?.children).startsWith('ab')).toBe(true);
    expect(values).not.toHaveProperty('onClick');
  });

  it('writes only changed props into the code', () => {
    const demo = customisableDemo('magic-ui/shimmer-button')!;
    expect(demo.code(demo.defaults)).toContain('<ShimmerButton className="shadow-2xl">');
    const changed = demo.code({ ...demo.defaults, shimmerDuration: 2.4, children: 'Buy now' });
    expect(changed).toContain('shimmerDuration="2.4s"');
    expect(changed).not.toContain('shimmerColor');
    expect(changed).toContain('Buy now');
  });
});
