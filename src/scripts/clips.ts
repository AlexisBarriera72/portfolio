/**
 * Video control shared by the feed and the demo dialog.
 *
 * A clip's <source> elements start with only `data-src`, so nothing downloads
 * until loadClip() is called for it. The feed loads the clips of the card on
 * screen and its neighbours, and unloads every other one (unloadClip): its
 * sources are detached and its buffered media released, so however many clips
 * the feed gets, only about three are ever held. The visitor's choices —
 * paused by hand, sound on, captions off — survive an unload and reload.
 *
 * Autoplay (muted, so browsers allow it) never happens when the visitor
 * prefers reduced motion or has pressed pause; the play button always works.
 *
 * Two kinds of "it didn't play" are kept apart:
 *  - the browser refused autoplay (NotAllowedError): nothing is wrong, the
 *    clip just waits paused with its play button;
 *  - the media failed (every source errored, a decode error, or play()
 *    reported NotSupportedError): the clip shows a message and a retry, and
 *    its play/sound/captions buttons are disabled. The poster stays.
 *
 * Every load gets a number. Errors and play() results from an earlier load
 * are ignored, so a late failure from a clip that was since unloaded and
 * reloaded can never mark the new load as failed.
 */

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

interface Load {
  /** Which load this is; bumped by every load and unload. */
  generation: number;
  /** Removes this load's listeners. */
  stop: AbortController;
}
const loads = new WeakMap<HTMLElement, Load>();

function videoOf(clip: HTMLElement): HTMLVideoElement | null {
  return clip.querySelector('video');
}

const generationOf = (clip: HTMLElement) => loads.get(clip)?.generation ?? 0;

/** End the current load's listeners and start a new generation. */
function nextGeneration(clip: HTMLElement): Load {
  loads.get(clip)?.stop.abort();
  const load = { generation: generationOf(clip) + 1, stop: new AbortController() };
  loads.set(clip, load);
  return load;
}

/** Captions follow the CC button (on unless the visitor turned them off). */
function applyCaptions(clip: HTMLElement): void {
  const video = videoOf(clip);
  const cc = clip.querySelector<HTMLButtonElement>('[data-clip-cc]');
  if (!video || !cc) return;
  const on = cc.getAttribute('aria-pressed') !== 'false';
  for (const track of video.textTracks) track.mode = on ? 'showing' : 'hidden';
}

/** Attach the real sources and start fetching. Safe to call repeatedly. */
export function loadClip(clip: HTMLElement): void {
  const video = videoOf(clip);
  if (!video || clip.dataset.loaded) return;
  const { generation, stop } = nextGeneration(clip);
  const current = () => clip.dataset.loaded === 'true' && generationOf(clip) === generation;

  // Every <source> failing is reported on the last one; decoding or network
  // errors after a source was chosen, on the video. Only this load's count.
  const sources = video.querySelectorAll<HTMLSourceElement>('source');
  const onError = () => {
    if (current()) fail(clip);
  };
  sources[sources.length - 1]?.addEventListener('error', onError, { signal: stop.signal });
  video.addEventListener('error', onError, { signal: stop.signal });
  video.addEventListener('loadedmetadata', () => applyCaptions(clip), { signal: stop.signal });

  for (const source of sources) {
    if (source.dataset.src) source.src = source.dataset.src;
  }
  clip.dataset.loaded = 'true';
  video.load();
  applyCaptions(clip);
}

/**
 * Detach a clip's sources and release what it buffered. Does nothing to a
 * clip that has nothing loaded. Keeps the visitor's choices.
 */
export function unloadClip(clip: HTMLElement): void {
  const video = videoOf(clip);
  if (!video || !clip.dataset.loaded) return;
  nextGeneration(clip);
  video.pause();
  for (const source of video.querySelectorAll('source')) source.removeAttribute('src');
  video.removeAttribute('src');
  delete clip.dataset.loaded;
  video.load(); // drops the buffer and stops any download in progress
  clip.classList.remove('is-playing');
  clearError(clip);
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
  const generation = generationOf(clip);
  video.play().catch((error: unknown) => {
    // A result from an earlier load (since unloaded or reloaded) says nothing about this one.
    if (generationOf(clip) !== generation) return;
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

/** Leave the error state: message gone, controls back. */
function clearError(clip: HTMLElement): void {
  if (!clip.dataset.failed) return;
  delete clip.dataset.failed;
  clip.classList.remove('is-error');
  for (const button of clip.querySelectorAll<HTMLButtonElement>('.clip-controls button')) button.disabled = false;
  const text = clip.querySelector<HTMLElement>('[data-clip-error-text]');
  if (text) text.textContent = '';
  const retry = clip.querySelector<HTMLButtonElement>('[data-clip-retry]');
  if (retry) retry.hidden = true;
}

/** Try the sources again from scratch. */
function retry(clip: HTMLElement): void {
  unloadClip(clip);
  clearError(clip);
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
    cc.setAttribute('aria-pressed', String(cc.getAttribute('aria-pressed') === 'false'));
    applyCaptions(clip);
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
