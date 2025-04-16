// src/components/ui/input.jsx
import React from "react";

export default function Input({
  label,
  id,
  error,
  className = "",
  ...props
}) {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <input
        id={id}
        className={`
          block w-full rounded-md shadow-sm py-2 px-3 sm:text-sm
          ${error ? "border-red-300 focus:ring-red-500 focus:border-red-500" : "border-gray-300 focus:ring-blue-500 focus:border-blue-500"}
        `}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}