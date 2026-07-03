/**
 * Real device haptics via the Vibration API, with graceful no-op fallback
 * on desktop / unsupported browsers. Fire-and-forget, never blocks.
 *
 * Usage:
 *   const haptic = useHaptic();
 *   <button onClick={() => { haptic.light(); doTap(); }}>
 *   <button onClick={() => { haptic.success(); checkIn(); }}>
 */
export function useHaptic() {
  const vibrate = (pattern: number | number[]) => {
    if (typeof window === 'undefined') return;
    if (!('vibrate' in navigator)) return;
    try {
      navigator.vibrate(pattern);
    } catch {
      // Some browsers throw if called outside a user gesture — safe to ignore.
    }
  };

  return {
    /** Tiny tap acknowledgement — nav taps, toggles, chip selection. */
    light: () => vibrate(10),
    /** Confirmed action — button presses, form submission. */
    medium: () => vibrate(25),
    /** Positive outcome — check-in logged, quest completed, XP gained. */
    success: () => vibrate([10, 30, 10]),
    /** Something went wrong — validation error, failed action. */
    error: () => vibrate([20, 40, 20]),
  };
}
