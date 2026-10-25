import { describe, it, expect, vi, afterEach } from 'vitest';
import { readCompassHeading, headingDelta, watchCompass } from '../lib/compass.js';

function environment() {
  const win = new EventTarget();
  win.screen = { orientation: { angle: 0 } };
  win.setTimeout = setTimeout;
  win.clearTimeout = clearTimeout;
  const doc = new EventTarget();
  doc.hidden = false;
  const emit = (values, type = 'deviceorientation') => {
    const event = new Event(type);
    Object.assign(event, values);
    win.dispatchEvent(event);
  };
  return { win, doc, emit };
}
afterEach(() => vi.useRealTimers());
describe('phone compass', () => {
  it('accepts north at zero and corrects screen orientation in portrait and landscape', () => {
    expect(readCompassHeading({ webkitCompassHeading: 0, webkitCompassAccuracy: 10 })).toBe(0);
    expect(readCompassHeading({ webkitCompassHeading: 350 }, 90)).toBe(80);
    expect(readCompassHeading({ absolute: true, alpha: 90 }, 90)).toBe(0);
    expect(readCompassHeading({ type: 'deviceorientationabsolute', alpha: 0 })).toBe(0);
  });
  it('does not turn relative gyro readings or inaccurate bearings into a compass', () => {
    for (const event of [{ alpha: 90, absolute: false }, { alpha: null, absolute: true }, { webkitCompassHeading: 0, webkitCompassAccuracy: -1 }, { webkitCompassHeading: 20, webkitCompassAccuracy: 60 }]) {
      expect(readCompassHeading(event)).toBeNull();
    }
  });
  it('crosses north by the shortest path instead of spinning all the way around', () => {
    expect(headingDelta(359, 1)).toBe(2);
    expect(headingDelta(1, 359)).toBe(-2);
    expect(headingDelta(721, 359)).toBe(-2);
  });
  it('clears stale bearings, recovers on new readings and removes listeners on stop', () => {
    vi.useFakeTimers();
    const { win, doc, emit } = environment();
    const heading = vi.fn(), status = vi.fn();
    const stop = watchCompass(heading, status, win, doc);
    emit({ absolute: true, alpha: 270 });
    expect(heading).toHaveBeenLastCalledWith(90);
    expect(status).toHaveBeenLastCalledWith('active');
    vi.advanceTimersByTime(5000);
    expect(heading).toHaveBeenLastCalledWith(null);
    expect(status).toHaveBeenLastCalledWith('waiting');
    emit({ absolute: true, alpha: 180 });
    expect(heading).toHaveBeenLastCalledWith(180);
    stop();
    heading.mockClear(); status.mockClear();
    emit({ absolute: true, alpha: 10 });
    vi.advanceTimersByTime(10000);
    expect(heading).not.toHaveBeenCalled();
    expect(status).not.toHaveBeenCalled();
  });
  it('pauses when hidden and waits for fresh sensor data when visible again', () => {
    vi.useFakeTimers();
    const { win, doc, emit } = environment();
    const heading = vi.fn(), status = vi.fn();
    const stop = watchCompass(heading, status, win, doc);
    emit({ webkitCompassHeading: 20 });
    doc.hidden = true; doc.dispatchEvent(new Event('visibilitychange'));
    heading.mockClear();
    emit({ webkitCompassHeading: 40 });
    vi.advanceTimersByTime(10000);
    expect(heading).not.toHaveBeenCalled();
    doc.hidden = false; doc.dispatchEvent(new Event('visibilitychange'));
    expect(heading).toHaveBeenLastCalledWith(null);
    emit({ webkitCompassHeading: 60 });
    expect(heading).toHaveBeenLastCalledWith(60);
    stop();
  });
  it('prefers absolute events if both Android event streams are delivered', () => {
    const { win, doc, emit } = environment();
    const heading = vi.fn();
    const stop = watchCompass(heading, () => {}, win, doc);
    emit({ alpha: 90 }, 'deviceorientationabsolute');
    emit({ alpha: 20, absolute: true });
    expect(heading).toHaveBeenLastCalledWith(270);
    stop();
  });
});
