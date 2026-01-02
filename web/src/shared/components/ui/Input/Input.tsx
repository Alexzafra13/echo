import { forwardRef, InputHTMLAttributes, ReactNode, useState, useMemo } from 'react';
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
    const [hasValue, setHasValue] = useState(!!props.value || !!props.defaultValue);

    // Si es tipo password, mostramos el botón de toggle
    const isPasswordField = type === 'password';
    const inputType = isPasswordField && showPassword ? 'text' : type;

    // Divide el label en caracteres para la animación wave
    const labelChars = useMemo(() => {
      if (!label) return [];
      return label.split('').map((char, index) => ({
        char: char === ' ' ? '\u00A0' : char, // Preservar espacios
        index,
      }));
    }, [label]);

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

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setHasValue(e.target.value.length > 0);
      props.onChange?.(e);
    };

    return (
      <div
        className={clsx(
          styles.wrapper,
          error && styles.error,
          size && styles[size],
          hasValue && styles.hasValue,
          className
        )}
      >
        <div
          className={clsx(
            styles.inputContainer,
            styles.waveGroup,
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
            onChange={handleChange}
            placeholder=" "
          />

          <span className={styles.bar} />

          {label && (
            <label htmlFor={inputId} className={styles.label}>
              {labelChars.map(({ char, index }) => (
                <span
                  key={index}
                  className={styles.labelChar}
                  style={{ '--index': index } as React.CSSProperties}
                >
                  {char}
                </span>
              ))}
            </label>
          )}

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
