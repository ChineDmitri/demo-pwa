/** Safari gesture events complement touch-action on browsers that expose them. */
export function installTouchBehavior(): () => void {
  const prevent = (event: Event) => event.preventDefault();
  const preventPinch = (event: TouchEvent) => {
    if (event.touches.length > 1) event.preventDefault();
  };
  const preventCallout = (event: Event) => {
    if (event.target instanceof Element && event.target.closest('[data-allow-save]')) return;
    if (event.target instanceof Element && event.target.closest('a, button, .button, img, video')) {
      event.preventDefault();
    }
  };
  document.addEventListener('gesturestart', prevent, { passive: false });
  document.addEventListener('gesturechange', prevent, { passive: false });
  document.addEventListener('touchstart', preventPinch, { passive: false });
  document.addEventListener('dblclick', prevent);
  document.addEventListener('contextmenu', preventCallout);
  document.addEventListener('dragstart', preventCallout);
  return () => {
    document.removeEventListener('gesturestart', prevent);
    document.removeEventListener('gesturechange', prevent);
    document.removeEventListener('touchstart', preventPinch);
    document.removeEventListener('dblclick', prevent);
    document.removeEventListener('contextmenu', preventCallout);
    document.removeEventListener('dragstart', preventCallout);
  };
}
