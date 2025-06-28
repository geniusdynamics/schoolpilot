
import React, { ReactNode, ElementType } from 'react';

// Props specific to our Button component's styling and behavior
interface ButtonBaseProps {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  className?: string; // Allow additional className
}

// Polymorphic 'as' prop
// C extends ElementType = 'button' makes 'button' the default component if 'as' is not provided.
export type PolymorphicButtonProps<C extends ElementType> = ButtonBaseProps & {
  as?: C;
} & Omit<React.ComponentPropsWithoutRef<C>, keyof ButtonBaseProps | 'as'>;
// React.ComponentPropsWithoutRef<C> gets all valid props for component C,
// then we Omit props already defined in ButtonBaseProps or 'as' itself to avoid conflicts.


const Button = <C extends ElementType = "button">({
  as,
  children,
  variant = 'primary',
  size = 'md',
  leftIcon,
  rightIcon,
  className = '',
  ...rest // Contains props for the 'as' component, like 'to' for Link
}: PolymorphicButtonProps<C>) => {
  const Component = as || 'button';

  const baseStyles = 'font-semibold rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-150 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed';

  const variantStyles = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500',
    secondary: 'bg-gray-200 text-gray-700 hover:bg-gray-300 focus:ring-gray-400 border border-gray-300', // Added border for better secondary look
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    ghost: 'bg-transparent text-indigo-600 hover:bg-indigo-50 focus:ring-indigo-500',
    outline: 'bg-transparent text-indigo-600 hover:bg-indigo-50 focus:ring-indigo-500 border border-indigo-600',
  };

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  const combinedClassName = `${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`;
  
  return (
    <Component className={combinedClassName} {...rest}>
      {leftIcon}
      <span>{children}</span>
      {rightIcon}
    </Component>
  );
};

export default Button;
