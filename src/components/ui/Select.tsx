"use client";

import { cn } from "@/lib/utils";
import { useState, useRef, useEffect, forwardRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  label?: string;
  error?: string;
  hint?: string;
  options: readonly SelectOption[];
  placeholder?: string;
  value?: string;
  onChange?: (e: { target: { value: string; name?: string } }) => void;
  name?: string;
  className?: string;
  id?: string;
  required?: boolean;
  disabled?: boolean;
}

const Select = forwardRef<HTMLButtonElement, SelectProps>(
  (
    {
      className,
      label,
      error,
      hint,
      id,
      options,
      placeholder,
      value,
      onChange,
      name,
      required,
      disabled,
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const selectId = id || label?.toLowerCase().replace(/\s+/g, "-");

    const selectedOption = options.find((opt) => opt.value === value);

    // Close when clicking outside
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          containerRef.current &&
          !containerRef.current.contains(event.target as Node)
        ) {
          setIsOpen(false);
        }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSelect = (optionValue: string) => {
      if (disabled) return;
      if (onChange) {
        onChange({ target: { value: optionValue, name } });
      }
      setIsOpen(false);
    };

    return (
      <div className={cn("w-full relative", className)} ref={containerRef}>
        {label && (
          <label
            htmlFor={selectId}
            className="block text-sm font-medium text-[#0F172A] mb-2"
          >
            {label}
            {required && (
              <span className="text-red-500 ml-1" aria-hidden="true">
                *
              </span>
            )}
          </label>
        )}

        <div className="relative">
          <button
            ref={ref}
            type="button"
            id={selectId}
            disabled={disabled}
            onClick={() => !disabled && setIsOpen(!isOpen)}
            className={cn(
              "w-full px-4 min-h-[50px] rounded-[12px] border border-[#E2E8F0] bg-white text-[#0F172A] text-left transition-all duration-200 cursor-pointer flex items-center justify-between",
              "focus:outline-none focus:ring-2 focus:ring-[#22D3EE] focus:border-transparent",
              "disabled:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-60",
              isOpen && "ring-2 ring-[#22D3EE] border-transparent shadow-sm",
              error && "border-red-500 focus:ring-red-500"
            )}
            aria-haspopup="listbox"
            aria-expanded={isOpen}
            aria-invalid={error ? "true" : "false"}
          >
            <span
              className={cn(
                "block truncate",
                !selectedOption && "text-[#64748B]"
              )}
            >
              {selectedOption
                ? selectedOption.label
                : placeholder || "Select option"}
            </span>
            <motion.div
              animate={{ rotate: isOpen ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="flex-shrink-0 ml-2"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M4 6L8 10L12 6"
                  stroke="#475569"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </motion.div>
          </button>

          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.98 }}
                animate={{ opacity: 1, y: 4, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.98 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="absolute z-[100] w-full bg-white border border-[#E2E8F0] rounded-[12px] shadow-2xl max-h-60 overflow-auto py-1 mt-1 focus:outline-none"
              >
                <ul role="listbox">
                  {options.map((option) => (
                    <li
                      key={option.value}
                      role="option"
                      aria-selected={value === option.value}
                      onClick={() => handleSelect(option.value)}
                      className={cn(
                        "px-4 py-3 text-sm cursor-pointer transition-colors flex items-center justify-between mx-1 rounded-lg",
                        value === option.value
                          ? "bg-slate-50 text-accent font-semibold"
                          : "text-[#475569] hover:bg-[#F8FAFC] hover:text-[#0F172A]"
                      )}
                    >
                      <span>{option.label}</span>
                      {value === option.value && (
                        <motion.svg
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="w-4 h-4 text-accent"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                          />
                        </motion.svg>
                      )}
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {error && (
          <p
            id={`${selectId}-error`}
            className="mt-2 text-sm text-red-500"
            role="alert"
          >
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={`${selectId}-hint`} className="mt-2 text-sm text-[#475569]">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";

export { Select };
