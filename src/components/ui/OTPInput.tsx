"use client";

import { cn } from "@/lib/utils";
import { useRef, useState, useEffect, KeyboardEvent, ClipboardEvent } from "react";

export interface OTPInputProps {
  length?: number;
  value?: string;
  onChange?: (value: string) => void;
  onComplete?: (value: string) => void;
  disabled?: boolean;
  error?: string;
  autoFocus?: boolean;
}

const OTPInput = ({
  length = 6,
  value = "",
  onChange,
  onComplete,
  disabled = false,
  error,
  autoFocus = true,
}: OTPInputProps) => {
  const [otp, setOtp] = useState<string[]>(
    value.split("").slice(0, length).concat(Array(length).fill("")).slice(0, length)
  );
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [autoFocus]);

  useEffect(() => {
    // Sync external value changes
    const newOtp = value.split("").slice(0, length).concat(Array(length).fill("")).slice(0, length);
    setOtp(newOtp);
  }, [value, length]);

  const handleChange = (index: number, raw: string) => {
    if (disabled) return;

    const digits = raw.replace(/\D/g, "");

    // Multi-digit input (mobile paste via onChange, or autofill): distribute from current index
    if (digits.length > 1) {
      const newOtp = [...otp];
      for (let i = 0; i < digits.length && index + i < length; i++) {
        newOtp[index + i] = digits[i];
      }
      setOtp(newOtp);

      const otpString = newOtp.join("");
      onChange?.(otpString);

      const lastFilled = Math.min(index + digits.length, length) - 1;
      inputRefs.current[lastFilled]?.focus();

      if (newOtp.every((d) => d !== "") && newOtp.length === length) {
        onComplete?.(otpString);
      }
      return;
    }

    // Single-digit (or empty): standard per-box typing
    const newDigit = digits.slice(-1);
    const newOtp = [...otp];
    newOtp[index] = newDigit;
    setOtp(newOtp);

    const otpString = newOtp.join("");
    onChange?.(otpString);

    // Auto-advance to next input
    if (newDigit && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Check if complete
    if (newOtp.every((d) => d !== "") && newOtp.length === length) {
      onComplete?.(otpString);
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (e.key === "Backspace") {
      if (!otp[index] && index > 0) {
        // Move to previous input on backspace if current is empty
        inputRefs.current[index - 1]?.focus();
        const newOtp = [...otp];
        newOtp[index - 1] = "";
        setOtp(newOtp);
        onChange?.(newOtp.join(""));
      } else {
        // Clear current input
        const newOtp = [...otp];
        newOtp[index] = "";
        setOtp(newOtp);
        onChange?.(newOtp.join(""));
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);

    if (pastedData) {
      const newOtp = pastedData.split("").concat(Array(length).fill("")).slice(0, length);
      setOtp(newOtp);

      const otpString = newOtp.join("");
      onChange?.(otpString);

      // Focus last filled input or last input
      const lastFilledIndex = Math.min(pastedData.length, length) - 1;
      inputRefs.current[lastFilledIndex]?.focus();

      // Check if complete
      if (newOtp.every((d) => d !== "") && newOtp.length === length) {
        onComplete?.(otpString);
      }
    }
  };

  const handleFocus = (index: number) => {
    // Select content on focus
    inputRefs.current[index]?.select();
  };

  return (
    <div className="w-full">
      <div className="flex justify-center gap-2 sm:gap-3">
        {Array.from({ length }).map((_, index) => (
          <input
            key={index}
            ref={(el) => {
              inputRefs.current[index] = el;
            }}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete={index === 0 ? "one-time-code" : "off"}
            value={otp[index]}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            onFocus={() => handleFocus(index)}
            disabled={disabled}
            className={cn(
              "w-10 h-12 sm:w-14 sm:h-16 text-center text-lg sm:text-2xl font-semibold rounded-[12px] border border-[#E2E8F0] bg-white text-[#0F172A] transition-all duration-200",
              "focus:outline-none focus:ring-2 focus:ring-[#22D3EE] focus:border-transparent",
              "disabled:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-60",
              error && "border-red-500 focus:ring-red-500"
            )}
            aria-label={`Digit ${index + 1} of ${length}`}
          />
        ))}
      </div>
      {error && (
        <p className="mt-3 text-sm text-red-500 text-center" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

OTPInput.displayName = "OTPInput";

export { OTPInput };
