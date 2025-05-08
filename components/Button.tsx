// components/Button.tsx
import React from 'react';

/**
 * Button variant types for styling
 * @typedef {('primary'|'secondary'|'danger'|'ghost')} ButtonVariant
 * @property {string} primary - Green background with white text
 * @property {string} secondary - Gray background with dark text
 * @property {string} danger - Red background with white text
 * @property {string} ghost - Transparent background with green text
 */
export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

/**
 * Button size types
 * @typedef {('sm'|'md'|'lg')} ButtonSize
 * @property {string} sm - Small size (px-2 py-1 text-sm)
 * @property {string} md - Medium size (px-4 py-2)
 * @property {string} lg - Large size (px-6 py-3 text-lg)
 */
export type ButtonSize = 'sm' | 'md' | 'lg';

/**
 * Props for the Button component
 * @interface ButtonProps
 * @extends {React.ButtonHTMLAttributes<HTMLButtonElement>}
 */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Button content */
  children: React.ReactNode;
  /** Visual variant of the button */
  variant?: ButtonVariant;
  /** Size variant of the button */
  size?: ButtonSize;
  /** Whether the button is in a loading state */
  isLoading?: boolean;
  /** Whether the button should take up the full width of its container */
  fullWidth?: boolean;
  /** Icon to display before the button text */
  leftIcon?: React.ReactNode;
  /** Icon to display after the button text */
  rightIcon?: React.ReactNode;
}

/**
 * A versatile button component that supports multiple variants, sizes, and states.
 * Includes built-in loading state with spinner and support for icons.
 * 
 * Features:
 * - Multiple visual variants (primary, secondary, danger, ghost)
 * - Three size options (sm, md, lg)
 * - Loading state with spinner animation
 * - Support for left and right icons
 * - Full width option
 * - Disabled state styling
 * - Hover and focus states
 * 
 * @example
 * // Basic usage
 * <Button>Click me</Button>
 * 
 * @example
 * // With variant and size
 * <Button variant="primary" size="lg">
 *   Submit
 * </Button>
 * 
 * @example
 * // With loading state
 * <Button isLoading>
 *   Processing...
 * </Button>
 * 
 * @example
 * // With icons
 * <Button leftIcon={<Icon />} rightIcon={<ArrowIcon />}>
 *   Next
 * </Button>
 * 
 * @example
 * // Full width button
 * <Button fullWidth variant="secondary">
 *   Cancel
 * </Button>
 */
export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  ...props
}) => {
  // Base classes
  const baseClasses = 'inline-flex items-center justify-center rounded font-medium transition-colors';
  
  // Size-specific classes
  const sizeClasses = {
    sm: 'px-2 py-1 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg'
  }[size];
  
  // Variant-specific classes with updated colors
  const variantClasses = {
    primary: 'bg-[#2db670] text-white hover:bg-[#259e5f] disabled:bg-[#93d8b7]',
    secondary: 'bg-gray-200 text-[#58595b] hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400',
    danger: 'bg-red-500 text-white hover:bg-red-600 disabled:bg-red-300',
    ghost: 'bg-transparent text-[#2db670] hover:bg-[#ebf7f1] disabled:text-gray-300 disabled:bg-transparent'
  }[variant];
  
  // Width class
  const widthClass = fullWidth ? 'w-full' : '';
  
  // Loading state
  const loadingClass = isLoading ? 'opacity-80 cursor-wait' : '';
  
  return (
    <button
      className={`${baseClasses} ${sizeClasses} ${variantClasses} ${widthClass} ${loadingClass} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      
      {!isLoading && leftIcon && <span className="mr-2">{leftIcon}</span>}
      {children}
      {!isLoading && rightIcon && <span className="ml-2">{rightIcon}</span>}
    </button>
  );
};