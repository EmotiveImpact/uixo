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

  it('centres off-centre content without moving it more than a fifth of the stage', () => {
    const fit = stageFit(stage, box(0, 160, 60, 40), base);
    expect(fit.x).toBeGreaterThan(0);
    expect(fit.x).toBeLessThanOrEqual(stage.width * 0.2);
  });
});
