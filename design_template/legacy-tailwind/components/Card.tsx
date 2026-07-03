import React from 'react';
import { cn, TACTILE } from './utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  bgColor?: string;
  onClick?: () => void;
}

/** Generic bordered surface. The base container for almost everything. */
export const Card = ({ children, className, bgColor = 'bg-surface', onClick, ...props }: CardProps) => (
  <div
    onClick={onClick}
    className={cn(
      'border-regular border-border rounded-card shadow-brutal-md p-4',
      bgColor,
      onClick && cn('cursor-pointer', TACTILE),
      className,
    )}
    {...props}
  >
    {children}
  </div>
);

export interface StatTileProps {
  value: React.ReactNode;
  label: React.ReactNode;
  bgColor?: string;
  decoration?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

/**
 * Big-number hero stat card (streak count, total distance, XP today).
 * Keep to one or two per screen so numbers stay attention-grabbing.
 */
export const StatTile = ({ value, label, bgColor = 'bg-secondary-pastel', decoration, onClick, className }: StatTileProps) => (
  <Card
    bgColor={bgColor}
    onClick={onClick}
    className={cn('relative overflow-hidden h-40 flex flex-col justify-start', className)}
  >
    <h2 className="text-4xl font-black font-display leading-none">{value}</h2>
    <p className="font-bold font-body mt-1.5">{label}</p>
    {decoration && <div className="absolute inset-0 pointer-events-none">{decoration}</div>}
  </Card>
);
