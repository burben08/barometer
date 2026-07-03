import React from 'react';
import { cn, TACTILE, TACTILE_SM } from './utils';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-ink',
  secondary: 'bg-secondary-pastel text-ink',
  ghost: 'bg-surface text-ink',
  danger: 'bg-danger text-white',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm gap-1.5 border-thin rounded-chip',
  md: 'px-5 py-2.5 text-base gap-2 border-regular rounded-control',
  lg: 'px-7 py-3.5 text-lg gap-2.5 border-regular rounded-control',
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

/** Primary interactive control. Every clickable action starts here first. */
export const Button = ({
  variant = 'primary',
  size = 'md',
  icon,
  fullWidth,
  className,
  children,
  ...props
}: ButtonProps) => (
  <button
    className={cn(
      'inline-flex items-center justify-center font-bold font-body border-border whitespace-nowrap',
      'shadow-brutal-md disabled:opacity-40 disabled:pointer-events-none disabled:shadow-brutal-md disabled:translate-x-0 disabled:translate-y-0',
      TACTILE,
      variantStyles[variant],
      sizeStyles[size],
      fullWidth && 'w-full',
      className,
    )}
    {...props}
  >
    {icon}
    {children}
  </button>
);

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  'aria-label': string;
}

const iconButtonSize: Record<string, string> = {
  sm: 'w-9 h-9',
  md: 'w-12 h-12',
  lg: 'w-14 h-14',
};

/** Circular icon-only button — nav bar actions, map overlay controls. */
export const IconButton = ({
  icon,
  variant = 'ghost',
  size = 'md',
  className,
  ...props
}: IconButtonProps) => (
  <button
    className={cn(
      'inline-flex items-center justify-center rounded-full border-regular border-border',
      'shadow-brutal-sm disabled:opacity-40 disabled:pointer-events-none',
      TACTILE_SM,
      variantStyles[variant],
      iconButtonSize[size],
      className,
    )}
    {...props}
  >
    {icon}
  </button>
);

export interface FabProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  label?: string;
}

/**
 * Floating action button for the app's ONE primary action (log activity,
 * check in, start quest). Anchor bottom-right, in easy thumb reach, above
 * the bottom nav. Use at most one per screen.
 */
export const Fab = ({ icon, label, className, ...props }: FabProps) => (
  <button
    className={cn(
      'fixed bottom-24 right-5 z-40 inline-flex items-center gap-2 pl-4 pr-5 py-4',
      'bg-primary text-ink border-thick border-border rounded-full',
      'shadow-brutal-lg font-bold font-display text-lg',
      TACTILE,
      className,
    )}
    {...props}
  >
    {icon}
    {label}
  </button>
);
