/** Joins class names, dropping falsy values. No dependency needed. */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * The signature "physical button press" interaction: on press, the element
 * shifts down-right by the shadow's offset and the shadow disappears,
 * reading as the element being pushed flat against the surface.
 * Pair with a `shadow-brutal-*` class. This is the ONE tactile pattern —
 * reuse it everywhere rather than inventing new press effects.
 */
export const TACTILE =
  'transition-[transform,box-shadow] duration-150 ease-out active:translate-x-[3px] active:translate-y-[3px] active:shadow-none';

/** Same idea, calibrated for elements using shadow-brutal-sm (2px offset). */
export const TACTILE_SM =
  'transition-[transform,box-shadow] duration-150 ease-out active:translate-x-[2px] active:translate-y-[2px] active:shadow-none';
