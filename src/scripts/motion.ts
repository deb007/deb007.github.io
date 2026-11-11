// Shared motion state. "Still" means prefers-reduced-motion or the site-wide pause control.
const reduceMQ = matchMedia('(prefers-reduced-motion: reduce)');

export const still = (): boolean =>
  reduceMQ.matches || document.documentElement.dataset.motion === 'paused';

export const isLight = (): boolean => {
  // Dark is the default; light only when the visitor chose it.
  return document.documentElement.dataset.theme === 'light';
};

export function onMotionChange(cb: () => void): void {
  reduceMQ.addEventListener('change', cb);
  document.addEventListener('motionchange', cb);
}

export function onThemeChange(cb: () => void): void {
  document.addEventListener('themechange', cb);
}
