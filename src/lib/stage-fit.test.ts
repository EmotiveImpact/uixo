import { describe, expect, it } from 'vitest';
import { STAGE_FILL_WIDTH, stageFit } from '../../shared/preview-stage';

const stage = { width: 420, height: 315 };
const base = 420 / 480;
const box = (x: number, y: number, width: number, height: number) => ({
  x,
  y,
  width,
  height,
  viewportWidth: 480,
  viewportHeight: 360,
});

describe('stage fit for live demos on cards', () => {
  it('keeps the standard canvas when nothing was measured', () => {
    expect(stageFit(stage, null, base)).toEqual({ scale: base, x: 0, y: 0 });
  });

  it('never shrinks a full-bleed demo below the standard canvas', () => {
    expect(stageFit(stage, box(0, 0, 480, 360), base)).toEqual({ scale: base, x: 0, y: 0 });
  });

  it('grows a small centred component to fill most of the stage width', () => {
    const fit = stageFit(stage, box(140, 160, 200, 40), base);
    expect(fit.scale * 200).toBeCloseTo(STAGE_FILL_WIDTH * stage.width, 5);
    expect(Math.abs(fit.x)).toBeLessThan(1);
  });

  it('caps the zoom so tiny pieces do not blur', () => {
    expect(stageFit(stage, box(236, 176, 8, 8), base).scale).toBe(1.6);
  });

  it('centres off-centre content by up to a fifth of the stage', () => {
    const fit = stageFit(stage, box(60, 160, 100, 40), base);
    expect(fit.x).toBeGreaterThan(0);
    expect(fit.x).toBeLessThanOrEqual(stage.width * 0.2);
  });

  it('moves grown content at the very edge further, so none of it is cut off', () => {
    const fit = stageFit(stage, box(0, 160, 60, 40), base);
    expect((0 - 240) * fit.scale + stage.width / 2 + fit.x).toBeGreaterThanOrEqual(0);
  });

  it('moves wide content laid out at the top of its page towards the middle', () => {
    const fit = stageFit(stage, box(48, 46, 384, 56), base);
    expect(fit.scale).toBe(base);
    expect(fit.y).toBeCloseTo(stage.height * 0.2, 5);
    expect(fit.x).toBe(0);
  });

  it('never moves standard-canvas content off the stage', () => {
    const fit = stageFit(stage, box(0, 300, 480, 60), base);
    expect(fit.y).toBeLessThan(0);
    expect((300 + 60) * base + fit.y).toBeLessThanOrEqual(stage.height);
    expect(stageFit(stage, box(0, 0, 480, 360), base)).toEqual({ scale: base, x: 0, y: 0 });
  });

  it('keeps a demo that paints its own page where it is', () => {
    const fit = stageFit(stage, { ...box(0, 0, 60, 40), opaque: true }, base);
    expect(fit.x).toBe(0);
    expect(fit.y).toBe(0);
  });

  it('keeps grown content whole when it sits at the foot of its demo', () => {
    const fit = stageFit(stage, box(190, 222, 98, 38), base);
    expect(fit.scale).toBeGreaterThan(base);
    // The frame keeps the layout centred, so positions count from the middle.
    const top = (222 - 180) * fit.scale + stage.height / 2 + fit.y;
    expect(top).toBeGreaterThanOrEqual(0);
    expect(top + 38 * fit.scale).toBeLessThanOrEqual(stage.height);
  });

  it('never zooms in so far that a fixed-height demo no longer fits its frame', () => {
    const fit = stageFit(stage, { ...box(190, 222, 98, 38), layoutHeight: 160 }, base);
    expect(fit.scale).toBeCloseTo(stage.height / 200, 5);
  });
});
