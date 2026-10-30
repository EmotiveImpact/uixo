/**
 * Card stages light every live demo with a tinted colour field. A demo opts in with
 * `stage=clear`: its page turns transparent and it reports where its visible content
 * sits, so the host can frame small components larger without clipping big ones.
 */
export type PreviewContentBox = {
  /** Visible content, in the demo's own CSS pixels. */
  x: number;
  y: number;
  width: number;
  height: number;
  /** The demo's viewport when it was measured. */
  viewportWidth: number;
  viewportHeight: number;
  /** The page paints its own colour, so moving the frame would show an edge. */
  opaque?: boolean;
  /** Height of the demo's own layout (its wrappers included), when shorter than the page. */
  layoutHeight?: number;
};

export type PreviewSizeMessage = {
  type: 'uixo-preview-size';
  id: string;
  box: PreviewContentBox;
};

const PAINTED = new Set(['canvas', 'img', 'video', 'input', 'button', 'textarea', 'select', 'svg']);
const TRANSPARENT = new Set(['rgba(0, 0, 0, 0)', 'transparent']);

function painted(element: Element, style: CSSStyleDeclaration) {
  return (
    element.childElementCount === 0 ||
    PAINTED.has(element.tagName.toLowerCase()) ||
    !TRANSPARENT.has(style.backgroundColor) ||
    style.backgroundImage !== 'none' ||
    parseFloat(style.borderTopWidth) > 0 ||
    style.boxShadow !== 'none'
  );
}

/**
 * The union of everything that paints: leaf elements, text, and boxes with a fill,
 * border or shadow. Plain layout wrappers are skipped, so a `w-full` wrapper around a
 * small button measures as the button, while a full-bleed background measures as the page.
 */
export function measureContent(root: Element): PreviewContentBox | null {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let left = Infinity;
  let top = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;
  type Clip = { l: number; t: number; r: number; b: number };
  const page: Clip = { l: 0, t: 0, r: vw, b: vh };
  // What an element may paint inside: the viewport, narrowed by every ancestor that
  // clips its overflow (a shimmer's spinning gradient stays inside its button).
  const clips = new Map<Element, Clip>();
  const clipOf = (element: Element | null): Clip => {
    if (!element || element === root.parentElement) return page;
    const known = clips.get(element);
    if (known) return known;
    const outer = clipOf(element.parentElement);
    const style = getComputedStyle(element);
    let clip = outer;
    if (style.overflowX !== 'visible' || style.overflowY !== 'visible') {
      const rect = element.getBoundingClientRect();
      clip = {
        l: Math.max(outer.l, rect.left),
        t: Math.max(outer.t, rect.top),
        r: Math.min(outer.r, rect.right),
        b: Math.min(outer.b, rect.bottom),
      };
    }
    clips.set(element, clip);
    return clip;
  };
  const add = (rect: DOMRect, owner: Element | null) => {
    if (rect.width < 1 || rect.height < 1) return;
    const clip = clipOf(owner);
    const l = Math.max(rect.left, clip.l);
    const t = Math.max(rect.top, clip.t);
    const r = Math.min(rect.right, clip.r);
    const b = Math.min(rect.bottom, clip.b);
    if (r <= l || b <= t) return;
    left = Math.min(left, l);
    top = Math.min(top, t);
    right = Math.max(right, r);
    bottom = Math.max(bottom, b);
  };
  // An SVG counts as one picture; its parts never widen it.
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
    acceptNode: (node) =>
      node.parentElement?.closest('svg') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT,
  });
  let checked = 0;
  for (let node = walker.nextNode(); node && checked < 4000; node = walker.nextNode()) {
    checked += 1;
    if (node.nodeType === Node.TEXT_NODE) {
      if (!node.textContent?.trim()) continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      add(range.getBoundingClientRect(), node.parentElement);
      continue;
    }
    const element = node as Element;
    const style = getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden') continue;
    // Invisible form controls (a Radix checkbox's native input) paint nothing.
    if (style.opacity === '0' && element.childElementCount === 0) continue;
    if (painted(element, style)) add(element.getBoundingClientRect(), element.parentElement);
  }
  if (!Number.isFinite(left)) return null;
  const opaque = !TRANSPARENT.has(getComputedStyle(document.body).backgroundColor);
  // A fixed-height wrapper does not shrink with the frame, so the host must not zoom in
  // so far that the frame becomes shorter than it.
  const layoutHeight = Math.max(
    0,
    ...Array.from(root.children, (child) => child.getBoundingClientRect().height),
  );
  const fixedLayout = layoutHeight > 0 && layoutHeight < 0.9 * (vh - STAGE_PADDING * 2);
  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
    viewportWidth: vw,
    viewportHeight: vh,
    ...(opaque ? { opaque } : {}),
    ...(fixedLayout ? { layoutHeight } : {}),
  };
}

/**
 * Report the content box a few times while the demo settles, as the union of what it
 * has shown, so an animation that grows (typing, counting) is framed for its full size.
 * Returns a cleanup function.
 */
export function reportContentSize(id: string, root: () => Element | null): () => void {
  let union: PreviewContentBox | null = null;
  let frame = 0;
  // A fixed-height layout is judged in the first frame the demo gets. Once the host zooms
  // in, the frame is shorter and the same layout no longer looks fixed, so it is kept.
  let first: { width: number; height: number } | null = null;
  let layoutHeight: number | undefined;
  const send = () => {
    const element = root();
    if (!element) return;
    const measured = measureContent(element);
    if (!measured) return;
    first ??= { width: measured.viewportWidth, height: measured.viewportHeight };
    if (measured.viewportWidth === first.width && measured.viewportHeight === first.height)
      layoutHeight = Math.max(layoutHeight ?? 0, measured.layoutHeight ?? 0) || undefined;
    const box = { ...measured, layoutHeight };
    if (!layoutHeight) delete box.layoutHeight;
    if (
      union &&
      union.viewportWidth === box.viewportWidth &&
      union.viewportHeight === box.viewportHeight
    ) {
      const right = Math.max(union.x + union.width, box.x + box.width);
      const bottom = Math.max(union.y + union.height, box.y + box.height);
      const x = Math.min(union.x, box.x);
      const y = Math.min(union.y, box.y);
      union = { ...box, x, y, width: right - x, height: bottom - y };
    } else {
      union = box;
    }
    const message: PreviewSizeMessage = { type: 'uixo-preview-size', id, box: union };
    parent.postMessage(message, '*');
  };
  const schedule = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(send);
  };
  schedule();
  const timers = [500, 1400, 3200].map((delay) => window.setTimeout(schedule, delay));
  window.addEventListener('resize', schedule);
  return () => {
    cancelAnimationFrame(frame);
    timers.forEach((timer) => window.clearTimeout(timer));
    window.removeEventListener('resize', schedule);
  };
}

/** A card stage asks its demo to take focus, or the demo tells the card it was left. */
export type PreviewFocusMessage =
  { type: 'uixo-preview-enter'; id: string } | { type: 'uixo-preview-leave'; id: string };

const TABBABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), [contenteditable="true"]';

/**
 * On a card stage the frame is one "Try" stop. Enter on the card sends `uixo-preview-enter`
 * and the demo focuses its first control; Escape inside the demo, when the demo does not
 * use it itself, sends `uixo-preview-leave` so the card takes focus back.
 */
export function handleStageFocus(id: string): () => void {
  const receive = (event: MessageEvent) => {
    if (event.source !== parent || event.data?.type !== 'uixo-preview-enter') return;
    const first = document.querySelector<HTMLElement>(TABBABLE);
    if (first) first.focus();
    else document.body.focus();
  };
  const keydown = (event: KeyboardEvent) => {
    if (event.key !== 'Escape' || event.defaultPrevented) return;
    const message: PreviewFocusMessage = { type: 'uixo-preview-leave', id };
    parent.postMessage(message, '*');
  };
  window.addEventListener('message', receive);
  window.addEventListener('keydown', keydown);
  return () => {
    window.removeEventListener('message', receive);
    window.removeEventListener('keydown', keydown);
  };
}

/** The harness pads a clear stage by this much on each side (stage.css). */
const STAGE_PADDING = 20;

/** On a card stage, small components grow to fill about this share of the stage. */
export const STAGE_FILL_WIDTH = 0.62;
const STAGE_FILL_HEIGHT = 0.72;
const STAGE_MAX_SCALE = 1.6;

/**
 * Scale and offset that frame a demo's measured content on a card stage. Never smaller
 * than the standard canvas, so full-bleed demos look as before; small components grow
 * and are centred on their visible content rather than on their page.
 */
export function stageFit(
  stage: { width: number; height: number },
  box: PreviewContentBox | null,
  base: number,
  limits: { maxScale?: number; fillWidth?: number; fillHeight?: number } = {},
): { scale: number; x: number; y: number } {
  if (!box || box.width < 1 || box.height < 1) return { scale: base, x: 0, y: 0 };
  const fit = Math.min(
    ((limits.fillWidth ?? STAGE_FILL_WIDTH) * stage.width) / box.width,
    ((limits.fillHeight ?? STAGE_FILL_HEIGHT) * stage.height) / box.height,
    limits.maxScale ?? STAGE_MAX_SCALE,
  );
  // Zooming in shrinks the frame; it must stay tall enough for the demo's own layout.
  const room = box.layoutHeight ? stage.height / (box.layoutHeight + STAGE_PADDING * 2) : Infinity;
  const scale = Math.max(Math.min(fit, room), base);
  if (box.opaque) return { scale, x: 0, y: 0 };
  const limitX = stage.width * 0.2;
  const limitY = stage.height * 0.2;
  const dx = box.x + box.width / 2 - box.viewportWidth / 2;
  const dy = box.y + box.height / 2 - box.viewportHeight / 2;
  let x = Math.max(-limitX, Math.min(limitX, -dx * scale));
  let y = Math.max(-limitY, Math.min(limitY, -dy * scale));
  // The frame keeps the demo's layout centred, so content sits where it did relative to
  // the middle. Content that stays near the edge (a search bar at the top of its page, a
  // button at the foot of its demo) moves past the usual limit when that is what keeps
  // all of it on the stage.
  const inside = (offset: number, start: number, size: number, view: number, room: number) => {
    const from = (start - view / 2) * scale + room / 2;
    if (size * scale > room) return offset;
    return Math.max(-from, Math.min(room - from - size * scale, offset));
  };
  x = inside(x, box.x, box.width, box.viewportWidth, stage.width);
  y = inside(y, box.y, box.height, box.viewportHeight, stage.height);
  // Content that fills the frame and is cut off at its edge carries on past it, so its
  // middle is unknown and it stays where the demo put it (a tall demo starts below the
  // badges).
  const runsOff = (start: number, size: number, view: number) =>
    size >= view * 0.8 && (start <= 1 || start + size >= view - 1);
  if (runsOff(box.x, box.width, box.viewportWidth)) x = 0;
  if (runsOff(box.y, box.height, box.viewportHeight)) y = 0;
  if (Math.abs(x) < 1) x = 0;
  if (Math.abs(y) < 1) y = 0;
  return { scale, x, y };
}
