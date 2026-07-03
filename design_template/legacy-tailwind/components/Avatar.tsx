import React from 'react';
import { cn } from './utils';

export interface AvatarProps {
  src?: string;
  initial?: string;
  size?: 'sm' | 'md' | 'lg';
  bgColor?: string;
  className?: string;
}

const sizeStyles = {
  sm: 'w-9 h-9 text-sm border-thin',
  md: 'w-12 h-12 text-xl border-regular',
  lg: 'w-20 h-20 text-3xl border-regular',
};

/** Circular avatar — photo if available, else a colored initial. */
export const Avatar = ({ src, initial = '?', size = 'md', bgColor = 'bg-primary', className }: AvatarProps) => (
  <div
    className={cn(
      'rounded-full border-border shadow-brutal-sm overflow-hidden shrink-0 flex items-center justify-center font-black font-display text-white',
      sizeStyles[size],
      !src && bgColor,
      className,
    )}
  >
    {src ? <img src={src} alt="" className="w-full h-full object-cover" /> : initial}
  </div>
);
