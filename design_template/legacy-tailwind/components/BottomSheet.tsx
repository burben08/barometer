import React from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from './utils';

export interface BottomSheetProps {
  expanded: boolean;
  onToggle: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
  /** Tailwind height class applied when expanded, e.g. "h-72". Defaults to a tall sheet. */
  expandedHeight?: string;
  className?: string;
}

/**
 * Collapsible panel anchored above the bottom nav — the standard pattern
 * for "nearby list" / "selected pin detail" over a map. Tap the header
 * (or drag handle) to expand/collapse.
 */
export const BottomSheet = ({
  expanded,
  onToggle,
  title,
  children,
  expandedHeight = 'h-80',
  className,
}: BottomSheetProps) => (
  <div
    className={cn(
      'absolute bottom-24 left-4 right-4 bg-surface border-regular border-border rounded-sheet shadow-brutal-md z-20 flex flex-col overflow-hidden',
      'transition-[height] duration-300 ease-in-out',
      expanded ? expandedHeight : 'h-16',
      className,
    )}
  >
    <div className="flex-none h-16 flex items-center justify-between px-6 cursor-pointer shrink-0" onClick={onToggle}>
      <div className="mx-auto -ml-8 w-10 h-1.5 rounded-full bg-border/20 absolute left-1/2 -translate-x-1/2 top-2" />
      <span className="font-bold font-body text-lg truncate">{title}</span>
      <div className="p-2 border-thin border-border rounded-full bg-bg shrink-0">
        {expanded ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
      </div>
    </div>
    <div
      className={cn(
        'flex-1 overflow-y-auto px-6 pb-6 transition-opacity duration-300',
        expanded ? 'opacity-100' : 'opacity-0 pointer-events-none',
      )}
    >
      {children}
    </div>
  </div>
);
