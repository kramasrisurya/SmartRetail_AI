import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'success' | 'outline' | 'dark' | 'muted';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  className,
  variant = 'secondary',
  size = 'sm',
  ...props
}) => {
  const baseStyles = 'inline-flex items-center font-semibold rounded-full select-none tracking-wide';

  const sizeStyles = {
    sm: 'text-[11px] px-2.5 py-0.5',
    md: 'text-xs px-3 py-1',
  };

  const variantStyles = {
    primary: 'bg-primary-50 text-primary border border-primary-200',
    secondary: 'bg-blue-50 text-blue-700 border border-blue-200',
    accent: 'bg-amber-50 text-amber-800 border border-amber-200',
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    outline: 'bg-white text-slate-700 border border-slate-300',
    dark: 'bg-navy-800 text-cyan-400 border border-slate-700',
    muted: 'bg-slate-100 text-slate-600 border border-slate-200',
  };

  return (
    <span
      className={twMerge(clsx(baseStyles, sizeStyles[size], variantStyles[variant], className))}
      {...props}
    >
      {children}
    </span>
  );
};
