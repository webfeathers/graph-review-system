// src/components/ui/button.jsx
import React from "react";

export default function Button({
  children,
  variant = "primary",
  size = "md",
  className = "",
  ...props
}) {
  const baseClasses = "inline-flex items-center justify-center border font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2";
  
  // Define variant classes
  const variantClasses = {
    primary: "border-transparent text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500",
    secondary: "border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:ring-blue-500",
    danger: "border-transparent text-white bg-red-600 hover:bg-red-700 focus:ring-red-500",
    success: "border-transparent text-white bg-green-600 hover:bg-green-700 focus:ring-green-500",
  };
  
  // Define size classes
  const sizeClasses = {
    sm: "px-2.5 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-5 py-3 text-base",
  };
  
  const allClasses = `
    ${baseClasses} 
    ${variantClasses[variant]} 
    ${sizeClasses[size]} 
    ${className}
    ${props.disabled ? "opacity-50 cursor-not-allowed" : ""}
  `;
  
  return <button className={allClasses} {...props}>{children}</button>;
}