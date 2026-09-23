/**
 * The device demo dialog. The client's site loads only when the dialog opens
 * and is unloaded when it closes. The device buttons give the frame a real
 * device width; the frame is then scaled down to fit the stage, so the site
 * lays itself out exactly as it would on that device. For a site that can't be
 * framed, the same buttons swap between screenshots taken at those widths.
 *
 * A live demo also has those screenshots behind an "En vivo / Capturas"
 * switch, for when the frame stays blank. Nothing here waits on the frame's
 * `load` event: a refused or failed frame fires it too.
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
    if (!iframe || !stage || !screen || stage.hidden) return;
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

  const loadSite = () => {
    if (!iframe) return;
    const src = iframe.dataset.demoSrc!;
    if (iframe.getAttribute('src') !== src) iframe.src = src;
    if (stage) resize.observe(stage);
    fit();
  };

  // Unload the client's site so its scripts stop running in the background.
  const unloadSite = () => {
    resize.disconnect();
    if (iframe) iframe.src = 'about:blank';
  };

  // Live demos only: the live site or its screenshots.
  const views = [...dialog.querySelectorAll<HTMLButtonElement>('[data-demo-view]')];
  const shotsStage = dialog.querySelector<HTMLElement>('[data-demo-shots]');
  const hint = dialog.querySelector<HTMLElement>('[data-demo-hint]');
  let view: 'live' | 'shots' = iframe ? 'live' : 'shots';

  const show = (next: typeof view) => {
    view = next;
    for (const button of views) button.setAttribute('aria-pressed', String(button.dataset.demoView === next));
    if (stage) stage.hidden = next !== 'live';
    if (shotsStage) shotsStage.hidden = next !== 'shots';
    if (hint) hint.hidden = next !== 'live';
    if (next === 'live') loadSite();
    else unloadSite();
  };

  for (const button of views) {
    button.addEventListener('click', () => show(button.dataset.demoView === 'shots' ? 'shots' : 'live'));
  }

  opener.addEventListener('click', () => {
    dialog.showModal();
    // The last choice sticks: someone who saw a blank frame gets the screenshots again.
    if (view === 'live') loadSite();
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
      // The capture taken at this device's width, whichever view is showing.
      for (const shot of shots) shot.hidden = shot.dataset.device !== device.dataset.device;
    });
  }

  dialog.addEventListener('close', () => {
    unloadSite();
    if (clip) pauseClip(clip);
  });

  // A click on the backdrop (outside the dialog box) closes it.
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.close();
  });
}
