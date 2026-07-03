import React from 'react';
import { cn } from './utils';

export interface NavItem {
  key: string;
  icon: React.ReactElement;
  label: string;
}

export interface BottomNavProps {
  items: NavItem[];
  current: string;
  onChange: (key: string) => void;
}

/**
 * Fixed bottom navigation, pill-shaped, fading into the page background
 * so it never hard-clips content behind it. Pair with a `pb-24` spacer
 * on scrollable content so nothing sits underneath it.
 */
export const BottomNav = ({ items, current, onChange }: BottomNavProps) => (
  <div className="fixed bottom-0 left-0 right-0 p-4 pb-6 bg-gradient-to-t from-bg via-bg to-transparent z-50 pointer-events-none">
    <div className="max-w-md mx-auto flex justify-around items-center bg-surface border-regular border-border rounded-full shadow-brutal-md p-2 pointer-events-auto">
      {items.map((item) => {
        const isActive = item.key === current;
        return (
          <button
            key={item.key}
            onClick={() => onChange(item.key)}
            aria-label={item.label}
            className={cn(
              'p-3 rounded-full transition-colors duration-150',
              isActive ? 'bg-secondary-pastel border-thin border-border shadow-brutal-sm' : 'hover:bg-bg',
            )}
          >
            {React.cloneElement(item.icon, {
              size: 22,
              strokeWidth: isActive ? 2.5 : 2,
              className: isActive ? 'text-ink' : 'text-ink-muted',
            } as any)}
          </button>
        );
      })}
    </div>
  </div>
);
