// Shared motion state. "Still" means prefers-reduced-motion or the site-wide pause control.
const reduceMQ = matchMedia('(prefers-reduced-motion: reduce)');

export const still = (): boolean =>
  reduceMQ.matches || document.documentElement.dataset.motion === 'paused';

export const isLight = (): boolean => {
  const t = document.documentElement.dataset.theme;
  return t ? t === 'light' : matchMedia('(prefers-color-scheme: light)').matches;
};

export function onMotionChange(cb: () => void): void {
  reduceMQ.addEventListener('change', cb);
  document.addEventListener('motionchange', cb);
}

export function onThemeChange(cb: () => void): void {
  document.addEventListener('themechange', cb);
  matchMedia('(prefers-color-scheme: light)').addEventListener('change', cb);
}
