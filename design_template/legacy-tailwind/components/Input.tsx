import React from 'react';
import { cn } from './utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  error?: string;
}

/** Text field with the bordered "carved slot" look. Icon slot on the left is optional. */
export const Input = ({ icon, error, className, ...props }: InputProps) => (
  <div className="flex flex-col gap-1.5">
    <div
      className={cn(
        'flex items-center bg-surface border-regular rounded-control shadow-brutal-sm p-1.5',
        error ? 'border-danger animate-shake' : 'border-border',
        className,
      )}
    >
      {icon && (
        <div className="bg-secondary-pastel p-2 rounded-chip border-thin border-border ml-0.5 flex items-center justify-center shrink-0">
          {icon}
        </div>
      )}
      <input
        className="flex-1 min-w-0 bg-transparent border-none outline-none px-3 py-1.5 text-base font-medium font-body placeholder:text-ink-muted"
        {...props}
      />
    </div>
    {error && <p className="text-sm font-semibold text-danger px-1">{error}</p>}
  </div>
);
