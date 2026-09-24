/**
 * The before/after slider. The range input is the source of truth (keyboard
 * and screen readers use it directly); dragging on the box moves it too.
 *
 * On touch, a drag only takes over once it is clearly sideways: the box has
 * `touch-action: pan-y`, so an up/down swipe that starts on it still scrolls
 * the feed, and a tap does not jump the handle.
 */
for (const figure of document.querySelectorAll<HTMLElement>('[data-compare]')) {
  const frame = figure.querySelector<HTMLElement>('.compare-frame');
  const range = figure.querySelector<HTMLInputElement>('.compare-range');
  if (!frame || !range) continue;

  // In the large view (a dialog), the box takes the shots' own proportions,
  // so they show whole with no bands beside them and the labels sit on them.
  if (figure.closest('dialog')) {
    const shot = frame.querySelector('img');
    const fit = () => {
      if (shot?.naturalWidth) frame.style.aspectRatio = `${shot.naturalWidth} / ${shot.naturalHeight}`;
    };
    shot?.addEventListener('load', fit);
    fit();
  }

  const set = (percent: number) => {
    const value = Math.min(100, Math.max(0, percent));
    frame.style.setProperty('--pos', `${value}%`);
    range.value = String(Math.round(value));
  };
  const setFromPointer = (e: PointerEvent) => {
    const box = frame.getBoundingClientRect();
    set(((e.clientX - box.left) / box.width) * 100);
  };

  range.addEventListener('input', () => set(Number(range.value)));

  let pointer: number | undefined;
  let dragging = false;
  let startX = 0;
  let startY = 0;

  frame.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    pointer = e.pointerId;
    startX = e.clientX;
    startY = e.clientY;
    dragging = e.pointerType === 'mouse';
    if (dragging) {
      frame.setPointerCapture(e.pointerId);
      setFromPointer(e);
    }
  });

  frame.addEventListener('pointermove', (e) => {
    if (e.pointerId !== pointer) return;
    if (!dragging) {
      const dx = Math.abs(e.clientX - startX);
      const dy = Math.abs(e.clientY - startY);
      if (dx < 8 || dx < dy) return;
      dragging = true;
      frame.setPointerCapture(e.pointerId);
    }
    setFromPointer(e);
  });

  const end = (e: PointerEvent) => {
    if (e.pointerId !== pointer) return;
    pointer = undefined;
    dragging = false;
  };
  frame.addEventListener('pointerup', end);
  frame.addEventListener('pointercancel', end);
}
