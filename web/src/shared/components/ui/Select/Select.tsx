import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import styles from './Select.module.css';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  className?: string;
}

/**
 * Custom Select Component
 * Elegant dropdown with animation and keyboard support
 */
export function Select({
  options,
  value,
  onChange,
  placeholder = 'Seleccionar...',
  label,
  className = '',
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset highlighted index when opening
  useEffect(() => {
    if (isOpen) {
      const currentIndex = options.findIndex((opt) => opt.value === value);
      setHighlightedIndex(currentIndex >= 0 ? currentIndex : 0);
    }
  }, [isOpen, options, value]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (isOpen && listRef.current && highlightedIndex >= 0) {
      const items = listRef.current.querySelectorAll('[role="option"]');
      items[highlightedIndex]?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex, isOpen]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      switch (event.key) {
        case 'Enter':
        case ' ':
          event.preventDefault();
          if (isOpen && highlightedIndex >= 0) {
            onChange(options[highlightedIndex].value);
            setIsOpen(false);
          } else {
            setIsOpen(true);
          }
          break;
        case 'ArrowDown':
          event.preventDefault();
          if (!isOpen) {
            setIsOpen(true);
          } else {
            setHighlightedIndex((prev) => Math.min(prev + 1, options.length - 1));
          }
          break;
        case 'ArrowUp':
          event.preventDefault();
          if (isOpen) {
            setHighlightedIndex((prev) => Math.max(prev - 1, 0));
          }
          break;
        case 'Escape':
          setIsOpen(false);
          break;
        case 'Tab':
          setIsOpen(false);
          break;
      }
    },
    [isOpen, highlightedIndex, options, onChange]
  );

  const handleOptionClick = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div
      ref={containerRef}
      className={`${styles.select} ${className}`}
      onKeyDown={handleKeyDown}
    >
      {label && <span className={styles.select__label}>{label}</span>}
      <button
        type="button"
        className={`${styles.select__trigger} ${isOpen ? styles['select__trigger--open'] : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className={styles.select__value}>
          {selectedOption?.label || placeholder}
        </span>
        <ChevronDown
          size={16}
          className={`${styles.select__icon} ${isOpen ? styles['select__icon--open'] : ''}`}
        />
      </button>

      {isOpen && (
        <ul
          ref={listRef}
          className={styles.select__dropdown}
          role="listbox"
          aria-activedescendant={
            highlightedIndex >= 0 ? `option-${options[highlightedIndex].value}` : undefined
          }
        >
          {options.map((option, index) => {
            const isSelected = option.value === value;
            const isHighlighted = index === highlightedIndex;

            return (
              <li
                key={option.value}
                id={`option-${option.value}`}
                role="option"
                aria-selected={isSelected}
                className={`${styles.select__option} ${
                  isSelected ? styles['select__option--selected'] : ''
                } ${isHighlighted ? styles['select__option--highlighted'] : ''}`}
                onClick={() => handleOptionClick(option.value)}
                onMouseEnter={() => setHighlightedIndex(index)}
              >
                <span>{option.label}</span>
                {isSelected && <Check size={16} className={styles.select__check} />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
