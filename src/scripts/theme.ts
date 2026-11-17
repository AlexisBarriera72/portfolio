/**
 * The dark/light switch. The page is dark unless the visitor chose light; the
 * head script (Base.astro) has already applied a remembered choice before the
 * first paint. This wires the buttons, keeps their label naming the theme
 * they switch to, and remembers the choice where storage is allowed.
 */
const root = document.documentElement;
const buttons = [...document.querySelectorAll<HTMLButtonElement>('[data-theme-toggle]')];
const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
const BAR = { dark: '#0e0e17', light: '#ffffff' };

type Theme = keyof typeof BAR;
const current = (): Theme => (root.dataset.theme === 'light' ? 'light' : 'dark');

function show(theme: Theme): void {
  if (theme === 'light') root.dataset.theme = 'light';
  else delete root.dataset.theme;
  if (meta) meta.content = BAR[theme];
  for (const button of buttons) {
    const label = (theme === 'light' ? button.dataset.toDark : button.dataset.toLight) ?? '';
    const text = button.querySelector('[data-theme-label]');
    if (text) text.textContent = label;
  }
}

show(current());

for (const button of buttons) {
  button.addEventListener('click', () => {
    const next: Theme = current() === 'light' ? 'dark' : 'light';
    show(next);
    try {
      localStorage.setItem('theme', next);
    } catch {
      // Private mode or blocked storage: the choice lasts for this page.
    }
  });
}
