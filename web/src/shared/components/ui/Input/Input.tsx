import { forwardRef, InputHTMLAttributes, ReactNode, useState } from 'react';
import clsx from 'clsx';
import { Eye, EyeOff } from 'lucide-react';
import styles from './Input.module.css';

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      size = 'md',
      className,
      id,
      type,
      ...props
    },
    ref
  ) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
    const [showPassword, setShowPassword] = useState(false);

    // Si es tipo password, mostramos el botón de toggle
    const isPasswordField = type === 'password';
    const inputType = isPasswordField && showPassword ? 'text' : type;

    // Si es password y no hay rightIcon, agregamos el toggle
    const effectiveRightIcon = isPasswordField && !rightIcon ? (
      <button
        type="button"
        onClick={() => setShowPassword(!showPassword)}
        className={styles.passwordToggle}
        aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
      >
        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
      </button>
    ) : rightIcon;

    return (
      <div
        className={clsx(
          styles.wrapper,
          error && styles.error,
          size && styles[size],
          className
        )}
      >
        {label && (
          <label htmlFor={inputId} className={styles.label}>
            {label}
          </label>
        )}

        <div
          className={clsx(
            styles.inputContainer,
            leftIcon && styles.withLeftIcon,
            effectiveRightIcon && styles.withRightIcon
          )}
        >
          {leftIcon && <span className={styles.leftIcon}>{leftIcon}</span>}

          <input
            ref={ref}
            id={inputId}
            type={inputType}
            className={styles.input}
            aria-invalid={!!error}
            aria-describedby={
              error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined
            }
            {...props}
          />

          {effectiveRightIcon && <span className={styles.rightIcon}>{effectiveRightIcon}</span>}
        </div>

        {error && (
          <span id={`${inputId}-error`} className={styles.errorText} role="alert">
            {error}
          </span>
        )}

        {helperText && !error && (
          <span id={`${inputId}-helper`} className={styles.helperText}>
            {helperText}
          </span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
