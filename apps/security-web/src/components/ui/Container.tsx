import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  size?: 'default' | 'narrow' | 'wide';
}

export const Container: React.FC<ContainerProps> = ({
  children,
  className,
  size = 'default',
  ...props
}) => {
  const sizeStyles = {
    default: 'max-w-7xl', // 1280px
    narrow: 'max-w-5xl',
    wide: 'max-w-[1400px]',
  };

  return (
    <div
      className={twMerge(clsx('mx-auto px-4 sm:px-6 lg:px-8 w-full', sizeStyles[size], className))}
      {...props}
    >
      {children}
    </div>
  );
};
