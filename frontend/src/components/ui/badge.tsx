import * as React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'easy' | 'medium' | 'hard';
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const baseStyles = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors border';

  const variants = {
    default: 'border-transparent bg-slate-800 text-slate-100',
    secondary: 'border-slate-700 bg-slate-800/80 text-slate-300',
    destructive: 'border-red-900/50 bg-red-950/60 text-red-400',
    success: 'border-emerald-900/50 bg-emerald-950/60 text-emerald-400',
    warning: 'border-amber-900/50 bg-amber-950/60 text-amber-400',
    outline: 'border-slate-700 text-slate-300',
    easy: 'border-emerald-800/40 bg-emerald-950/40 text-emerald-400 font-semibold',
    medium: 'border-amber-800/40 bg-amber-950/40 text-amber-400 font-semibold',
    hard: 'border-red-800/40 bg-red-950/40 text-red-400 font-semibold',
  };

  return <div className={cn(baseStyles, variants[variant], className)} {...props} />;
}
