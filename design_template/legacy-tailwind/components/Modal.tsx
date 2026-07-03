import React from 'react';
import { X } from 'lucide-react';
import { cn } from './utils';
import { IconButton } from './Button';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/**
 * Centered dialog for celebratory / blocking moments — achievement unlock,
 * quest complete, confirmation. Use sparingly; most detail views should be
 * a BottomSheet instead, which keeps the map visible.
 */
export const Modal = ({ open, onClose, title, children, className }: ModalProps) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-ink/50" onClick={onClose} />
      <div
        className={cn(
          'relative w-full max-w-sm bg-surface border-thick border-border rounded-sheet shadow-brutal-lg p-6 animate-pop-in',
          className,
        )}
      >
        <div className="flex items-start justify-between mb-4">
          {title && <h3 className="text-2xl font-black font-display leading-tight pr-4">{title}</h3>}
          <IconButton icon={<X size={18} />} size="sm" aria-label="Close" onClick={onClose} className="ml-auto shrink-0" />
        </div>
        {children}
      </div>
    </div>
  );
};
