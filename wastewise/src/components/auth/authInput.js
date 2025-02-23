'use client';
import { useState } from 'react';

export const AuthInput = ({ 
  label, 
  type = 'text', 
  id, 
  error, 
  value, 
  onChange,
  required = false 
}) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className="relative mb-6">
      <input
        type={type}
        id={id}
        value={value}
        onChange={onChange}
        required={required}
        className={`
          peer block w-full px-3 py-2 border-b-2 bg-transparent
          placeholder-transparent focus:outline-none transition-all duration-300
          ${error ? 'border-red-500' : isFocused || value 
            ? 'border-green-500' 
            : 'border-gray-300'}
        `}
        placeholder={label}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      />
      <label
        htmlFor={id}
        className={`
          absolute left-3 -top-5 text-sm transition-all duration-300
          peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-500 
          peer-placeholder-shown:top-2 peer-focus:-top-5 peer-focus:text-sm
          ${error ? 'text-red-500' : isFocused || value ? 'text-green-600' : 'text-gray-600'}
        `}
      >
        {label}
      </label>
      {error && (
        <p className="mt-1 text-sm text-red-500">{error}</p>
      )}
    </div>
  );
};
