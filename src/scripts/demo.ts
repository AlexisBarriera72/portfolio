/**
 * The device demo dialog. The client's site loads only when the dialog opens
 * and is unloaded when it closes. The device buttons give the frame a real
 * device width; the frame is then scaled down to fit the stage, so the site
 * lays itself out exactly as it would on that device. For a site that can't be
 * framed, the same buttons swap between screenshots taken at those widths.
 */
import { autoplayClip, pauseClip } from './clips';

for (const opener of document.querySelectorAll<HTMLButtonElement>('[data-demo-open]')) {
  const dialog = document.getElementById(opener.dataset.demoOpen ?? '');
  if (dialog instanceof HTMLDialogElement) setUp(opener, dialog);
}

function setUp(opener: HTMLButtonElement, dialog: HTMLDialogElement): void {
  const iframe = dialog.querySelector<HTMLIFrameElement>('iframe[data-demo-src]');
  const stage = dialog.querySelector<HTMLElement>('[data-demo-stage]');
  const screen = dialog.querySelector<HTMLElement>('[data-demo-screen]');
  const devices = [...dialog.querySelectorAll<HTMLButtonElement>('.demo-device')];
  const clip = dialog.querySelector<HTMLElement>('[data-clip]');

  const fit = () => {
    if (!iframe || !stage || !screen) return;
    const width = Number(iframe.getAttribute('width'));
    const height = Number(iframe.getAttribute('height'));
    const style = getComputedStyle(stage);
    const availableWidth = stage.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    const availableHeight = stage.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
    const scale = Math.min(1, availableWidth / width, availableHeight / height);
    iframe.style.transform = `scale(${scale})`;
    screen.style.width = `${Math.floor(width * scale)}px`;
    screen.style.height = `${Math.floor(height * scale)}px`;
  };

  const resize = new ResizeObserver(fit);

  opener.addEventListener('click', () => {
    dialog.showModal();
    if (iframe) {
      const src = iframe.dataset.demoSrc!;
      if (iframe.getAttribute('src') !== src) iframe.src = src;
      if (stage) resize.observe(stage);
      fit();
    }
    if (clip) autoplayClip(clip);
  });

  const shots = [...dialog.querySelectorAll<HTMLElement>('.demo-shot[data-device]')];

  for (const device of devices) {
    device.addEventListener('click', () => {
      for (const other of devices) other.setAttribute('aria-pressed', String(other === device));
      if (iframe) {
        iframe.setAttribute('width', device.dataset.width ?? '390');
        iframe.setAttribute('height', device.dataset.height ?? '844');
        fit();
      }
      // Screenshots mode: show the capture taken at this device's width.
      for (const shot of shots) shot.hidden = shot.dataset.device !== device.dataset.device;
    });
  }

  dialog.addEventListener('close', () => {
    resize.disconnect();
    // Unload the client's site so its scripts stop running in the background.
    if (iframe) iframe.src = 'about:blank';
    if (clip) pauseClip(clip);
  });

  // A click on the backdrop (outside the dialog box) closes it.
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.close();
  });
}
