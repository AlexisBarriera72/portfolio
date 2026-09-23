/**
 * Video control shared by the feed and the demo dialog.
 *
 * A clip's <source> elements start with only `data-src`, so nothing downloads
 * until loadClip() is called for it. Autoplay (muted, so browsers allow it)
 * never happens when the visitor prefers reduced motion or has pressed pause;
 * the play button always works.
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

/** Play because the clip came on screen — skipped under reduced motion or after a manual pause. */
export function autoplayClip(clip: HTMLElement): void {
  if (reducedMotion.matches || clip.dataset.userPaused) return;
  playClip(clip);
}

export function playClip(clip: HTMLElement): void {
  const video = videoOf(clip);
  if (!video) return;
  loadClip(clip);
  // Rejects if the browser blocks it (e.g. data saver); the play button remains.
  video.play().catch(() => {});
}

export function pauseClip(clip: HTMLElement): void {
  videoOf(clip)?.pause();
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
