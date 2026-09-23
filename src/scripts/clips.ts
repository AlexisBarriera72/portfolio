/**
 * Video control shared by the feed and the demo dialog.
 *
 * A clip's <source> elements start with only `data-src`, so nothing downloads
 * until loadClip() is called for it. Autoplay (muted, so browsers allow it)
 * never happens when the visitor prefers reduced motion or has pressed pause;
 * the play button always works.
 *
 * Two kinds of "it didn't play" are kept apart:
 *  - the browser refused autoplay (NotAllowedError): nothing is wrong, the
 *    clip just waits paused with its play button;
 *  - the media failed (every source errored, a decode error, or play()
 *    reported NotSupportedError): the clip shows a message and a retry, and
 *    its play/sound/captions buttons are disabled. The poster stays.
 */

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function videoOf(clip: HTMLElement): HTMLVideoElement | null {
  return clip.querySelector('video');
}

/** Attach the real sources and start fetching. Safe to call repeatedly. */
export function loadClip(clip: HTMLElement): void {
  const video = videoOf(clip);
  if (!video || clip.dataset.loaded) return;
  for (const source of video.querySelectorAll<HTMLSourceElement>('source[data-src]')) {
    source.src = source.dataset.src!;
  }
  clip.dataset.loaded = 'true';
  video.load();
}

/** Play because the clip came on screen — skipped under reduced motion, after a manual pause, or after a failure. */
export function autoplayClip(clip: HTMLElement): void {
  if (reducedMotion.matches || clip.dataset.userPaused || clip.dataset.failed) return;
  playClip(clip);
}

export function playClip(clip: HTMLElement): void {
  const video = videoOf(clip);
  if (!video || clip.dataset.failed) return;
  loadClip(clip);
  video.play().catch((error: unknown) => {
    const name = error instanceof DOMException ? error.name : '';
    // Autoplay refused (e.g. data saver): not an error, the play button is there.
    if (name === 'NotAllowedError') return;
    // A pause() or load() interrupted this play() — expected, nothing to report.
    if (name === 'AbortError') return;
    // No source this browser can play, or something unexpected.
    fail(clip);
  });
}

export function pauseClip(clip: HTMLElement): void {
  videoOf(clip)?.pause();
}

/** Put a clip in its error state: say so, offer a retry, disable the controls. */
function fail(clip: HTMLElement): void {
  if (clip.dataset.failed) return;
  clip.dataset.failed = 'true';
  clip.classList.add('is-error');
  clip.classList.remove('is-playing');
  for (const button of clip.querySelectorAll<HTMLButtonElement>('.clip-controls button')) button.disabled = true;
  const text = clip.querySelector<HTMLElement>('[data-clip-error-text]');
  if (text) text.textContent = text.dataset.message ?? '';
  const retry = clip.querySelector<HTMLButtonElement>('[data-clip-retry]');
  if (retry) retry.hidden = false;
}

/** Clear the error state and try the sources again. */
function retry(clip: HTMLElement): void {
  const video = videoOf(clip);
  if (!video) return;
  delete clip.dataset.failed;
  clip.classList.remove('is-error');
  for (const button of clip.querySelectorAll<HTMLButtonElement>('.clip-controls button')) button.disabled = false;
  const text = clip.querySelector<HTMLElement>('[data-clip-error-text]');
  if (text) text.textContent = '';
  const button = clip.querySelector<HTMLButtonElement>('[data-clip-retry]');
  if (button) button.hidden = true;
  video.load();
  delete clip.dataset.userPaused;
  playClip(clip);
}

/** Wire one clip's buttons and state classes. */
function setUp(clip: HTMLElement): void {
  const video = videoOf(clip);
  if (!video) return;
  const toggle = clip.querySelector<HTMLButtonElement>('[data-clip-toggle]');
  const sound = clip.querySelector<HTMLButtonElement>('[data-clip-sound]');

  const sync = () => {
    const playing = !video.paused;
    clip.classList.toggle('is-playing', playing);
    if (toggle) toggle.setAttribute('aria-label', (playing ? toggle.dataset.labelPause : toggle.dataset.labelPlay) ?? '');
  };
  video.addEventListener('playing', sync);
  video.addEventListener('pause', sync);

  // Every <source> failing is reported on the last one, not on the video.
  const sources = video.querySelectorAll('source');
  sources[sources.length - 1]?.addEventListener('error', () => fail(clip));
  // Decoding or network errors after a source was chosen.
  video.addEventListener('error', () => fail(clip));

  clip.querySelector<HTMLButtonElement>('[data-clip-retry]')?.addEventListener('click', () => retry(clip));

  toggle?.addEventListener('click', () => {
    if (video.paused) {
      delete clip.dataset.userPaused;
      playClip(clip);
    } else {
      clip.dataset.userPaused = 'true';
      pauseClip(clip);
    }
  });

  // CC: captions show by default (the clip starts muted); this hides them.
  const cc = clip.querySelector<HTMLButtonElement>('[data-clip-cc]');
  cc?.addEventListener('click', () => {
    const on = cc.getAttribute('aria-pressed') !== 'true';
    cc.setAttribute('aria-pressed', String(on));
    for (const track of video.textTracks) track.mode = on ? 'showing' : 'hidden';
  });

  sound?.addEventListener('click', () => {
    video.muted = !video.muted;
    clip.classList.toggle('is-unmuted', !video.muted);
    sound.setAttribute('aria-label', (video.muted ? sound.dataset.labelOn : sound.dataset.labelOff) ?? '');
    if (!video.muted && video.paused) playClip(clip);
  });
}

document.querySelectorAll<HTMLElement>('[data-clip]').forEach(setUp);

reducedMotion.addEventListener('change', () => {
  if (reducedMotion.matches) document.querySelectorAll<HTMLElement>('[data-clip]').forEach(pauseClip);
});
