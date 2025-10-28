import { HTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';
import styles from './Card.module.css';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'glass' | 'white';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  interactive?: boolean;
  bordered?: boolean;
  children: ReactNode;
}

export default function Card({
  variant = 'default',
  padding = 'md',
  interactive = false,
  bordered = false,
  children,
  className,
  ...props
}: CardProps) {
  return (
    <div
      className={clsx(
        styles.card,
        styles[variant],
        styles[`padding-${padding}`],
        interactive && styles.interactive,
        bordered && styles.bordered,
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
