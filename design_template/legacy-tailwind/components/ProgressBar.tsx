import React from 'react';
import { cn } from './utils';

export interface ProgressBarProps {
  value: number;
  max?: number;
  label?: React.ReactNode;
  trailingLabel?: React.ReactNode;
  fillColor?: string;
  className?: string;
  /** Set true right when the value increases to trigger a celebratory bounce on the fill. */
  justGained?: boolean;
}

/**
 * XP / streak / quest-completion bar. The bordered track + offset fill
 * reads as a physical gauge rather than a flat web progress bar.
 */
export const ProgressBar = ({
  value,
  max = 100,
  label,
  trailingLabel,
  fillColor = 'bg-secondary',
  className,
  justGained,
}: ProgressBarProps) => {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className={cn('w-full', className)}>
      {(label || trailingLabel) && (
        <div className="flex justify-between items-baseline mb-1.5">
          {label && <span className="font-bold font-body text-sm">{label}</span>}
          {trailingLabel && <span className="font-bold font-display text-sm text-ink-muted">{trailingLabel}</span>}
        </div>
      )}
      <div className="w-full h-4 bg-surface border-regular border-border rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full border-r-regular border-border transition-[width] duration-500 ease-out',
            fillColor,
            justGained && 'animate-bounce-once',
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};
