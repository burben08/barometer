import React from 'react';
import { cn } from './utils';

export type BadgeVariant = 'neutral' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger';

const variantStyles: Record<BadgeVariant, string> = {
  neutral: 'bg-bg',
  primary: 'bg-primary-pastel',
  secondary: 'bg-secondary-pastel',
  success: 'bg-success-pastel',
  warning: 'bg-warning',
  danger: 'bg-danger text-white',
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  icon?: React.ReactNode;
}

/** Small tag/chip for category, difficulty, distance, activity type. */
export const Badge = ({ variant = 'neutral', icon, className, children, ...props }: BadgeProps) => (
  <span
    className={cn(
      'inline-flex items-center gap-1 px-3 py-1 rounded-chip border-thin border-border text-xs font-bold font-body',
      variantStyles[variant],
      className,
    )}
    {...props}
  >
    {icon}
    {children}
  </span>
);
