import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: 'left' | 'center' | 'right';
  theme?: 'light' | 'dark';
  className?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  eyebrow,
  title,
  description,
  align = 'center',
  theme = 'light',
  className,
}) => {
  const alignStyles = {
    left: 'text-left',
    center: 'text-center mx-auto',
    right: 'text-right ml-auto',
  };

  const isDark = theme === 'dark';

  return (
    <div className={twMerge(clsx('max-w-3xl mb-12 sm:mb-16', alignStyles[align], className))}>
      {eyebrow && (
        <div className="inline-flex items-center gap-2 mb-3">
          <span
            className={clsx(
              'h-1.5 w-1.5 rounded-full',
              isDark ? 'bg-accent' : 'bg-secondary'
            )}
          />
          <span
            className={clsx(
              'text-xs sm:text-sm font-bold tracking-widest uppercase',
              isDark ? 'text-accent' : 'text-secondary'
            )}
          >
            {eyebrow}
          </span>
          <span
            className={clsx(
              'h-1.5 w-1.5 rounded-full',
              isDark ? 'bg-accent' : 'bg-secondary'
            )}
          />
        </div>
      )}
      <h2
        className={clsx(
          'text-2xl sm:text-3xl lg:text-4xl font-bold font-heading tracking-tight',
          isDark ? 'text-white' : 'text-slate-900'
        )}
      >
        {title}
      </h2>
      {description && (
        <p
          className={clsx(
            'mt-4 text-base sm:text-lg leading-relaxed',
            isDark ? 'text-slate-400' : 'text-slate-600'
          )}
        >
          {description}
        </p>
      )}
    </div>
  );
};
