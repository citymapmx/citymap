// Absolute compass bearings only: relative gyro angles cannot identify north.
export const normalizeHeading = value => ((value % 360) + 360) % 360;
export const headingDelta = (from, to) => normalizeHeading(to - from + 180) - 180;

export function readCompassHeading(event, screenAngle = 0) {
  if (Number.isFinite(event.webkitCompassHeading)) {
    if (Number.isFinite(event.webkitCompassAccuracy) && (event.webkitCompassAccuracy < 0 || event.webkitCompassAccuracy > 45)) return null;
    return normalizeHeading(event.webkitCompassHeading + screenAngle);
  }
  if ((event.absolute === true || event.type === 'deviceorientationabsolute') && Number.isFinite(event.alpha)) {
    return normalizeHeading(360 - event.alpha + screenAngle);
  }
  return null;
}

// No background sampling or network requests. Remove stale bearings and listeners.
export function watchCompass(onHeading, onStatus, win = window, doc = document) {
  let timer;
  let stopped = false;
  let listening = false;
  let absoluteSource = false;
  const clearBearing = () => { onHeading(null); onStatus('waiting'); };
  const armTimeout = () => {
    win.clearTimeout(timer);
    timer = win.setTimeout(clearBearing, 5000);
  };
  const receive = event => {
    if (doc.hidden || stopped) return;
    const angle = win.screen?.orientation?.angle ?? win.orientation ?? 0;
    const heading = readCompassHeading(event, Number.isFinite(angle) ? angle : 0);
    if (heading === null || (absoluteSource && event.type !== 'deviceorientationabsolute')) return;
    if (event.type === 'deviceorientationabsolute') absoluteSource = true;
    onHeading(heading);
    onStatus('active');
    armTimeout();
  };
  const remove = () => {
    win.removeEventListener('deviceorientation', receive);
    win.removeEventListener('deviceorientationabsolute', receive);
    win.clearTimeout(timer);
    listening = false;
  };
  const visibility = () => {
    remove();
    absoluteSource = false;
    clearBearing();
    if (!doc.hidden && !stopped) {
      win.addEventListener('deviceorientation', receive);
      win.addEventListener('deviceorientationabsolute', receive);
      listening = true;
      armTimeout();
    }
  };
  doc.addEventListener('visibilitychange', visibility);
  visibility();
  return () => {
    stopped = true;
    if (listening) remove();
    win.clearTimeout(timer);
    doc.removeEventListener('visibilitychange', visibility);
    onHeading(null);
  };
}
