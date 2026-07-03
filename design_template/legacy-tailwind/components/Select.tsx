import React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from './utils';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  options: SelectOption[];
  placeholder?: string;
}

/**
 * Dropdown field. Uses a native <select> for accessibility/mobile-picker
 * behavior, styled to match the rest of the system with a custom chevron.
 */
export const Select = ({ options, placeholder, className, ...props }: SelectProps) => (
  <div
    className={cn(
      'relative flex items-center bg-surface border-regular border-border rounded-control shadow-brutal-sm',
      className,
    )}
  >
    <select
      className="w-full appearance-none bg-transparent border-none outline-none pl-4 pr-10 py-3 text-base font-bold font-body cursor-pointer"
      defaultValue=""
      {...props}
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
    <ChevronDown size={18} strokeWidth={2.5} className="absolute right-3.5 pointer-events-none" />
  </div>
);
