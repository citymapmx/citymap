// Animate the list as one layer without remounting cards or changing their layout.
export function animateBusinessList(node, reducedMotion = false) {
  if (!node || reducedMotion || typeof node.animate !== 'function') return () => {};
  const animation = node.animate([
    { opacity: 0, transform: 'translateY(8px)' },
    { opacity: 1, transform: 'translateY(0)' },
  ], { duration: 240, easing: 'cubic-bezier(0.2, 0.7, 0.3, 1)' });
  return () => animation.cancel();
}
