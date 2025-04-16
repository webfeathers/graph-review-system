// src/components/ui/select.jsx
import React from "react";

export default function Select({
  label,
  id,
  options = [],
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
      <select
        id={id}
        className={`
          block w-full rounded-md shadow-sm py-2 pl-3 pr-10 sm:text-sm
          ${error ? "border-red-300 focus:ring-red-500 focus:border-red-500" : "border-gray-300 focus:ring-blue-500 focus:border-blue-500"}
        `}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}