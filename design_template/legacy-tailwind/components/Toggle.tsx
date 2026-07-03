import React from 'react';
import { cn } from './utils';

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

/** On/off switch with a bordered knob that slides and snaps — no easing overshoot needed, the border+shadow sell the physicality. */
export const Toggle = ({ checked, onChange, label, disabled, className }: ToggleProps) => (
  <label className={cn('inline-flex items-center gap-3 cursor-pointer', disabled && 'opacity-40 pointer-events-none', className)}>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative w-14 h-8 rounded-full border-regular border-border shadow-brutal-sm transition-colors duration-200 shrink-0',
        checked ? 'bg-secondary' : 'bg-surface',
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 w-6 h-6 rounded-full bg-white border-thin border-border transition-transform duration-200',
          checked ? 'translate-x-[26px]' : 'translate-x-0.5',
        )}
      />
    </button>
    {label && <span className="font-bold font-body text-base">{label}</span>}
  </label>
);
