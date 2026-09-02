"use client";

import { cn } from "@/lib/utils";
import { useState } from "react";

export interface AccordionItem {
  id: string;
  question: string;
  answer: string;
}

export interface AccordionProps {
  // Multi-item mode
  items?: AccordionItem[];
  className?: string;
  allowMultiple?: boolean;
  // Single-item mode (used by demo pages)
  title?: string;
  content?: string;
  titleClassName?: string;
  contentClassName?: string;
}

function Accordion({
  items,
  className,
  allowMultiple = false,
  title,
  content,
  titleClassName,
  contentClassName,
}: AccordionProps) {
  const [openItems, setOpenItems] = useState<string[]>([]);

  const toggleItem = (id: string) => {
    if (allowMultiple) {
      setOpenItems((prev) =>
        prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
      );
    } else {
      setOpenItems((prev) => (prev.includes(id) ? [] : [id]));
    }
  };

  // Single-item mode: title + content props
  if (title !== undefined) {
    const isOpen = openItems.includes("single");
    return (
      <div className={cn("border border-gray-200 rounded-lg overflow-hidden", className)}>
        <button
          onClick={() => toggleItem("single")}
          className={cn(
            "w-full px-6 py-4 flex items-center justify-between text-left transition-colors hover:bg-gray-50",
            titleClassName
          )}
          aria-expanded={isOpen}
        >
          <span>{title}</span>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className={cn("w-5 h-5 transition-transform duration-300 flex-shrink-0", isOpen && "rotate-180")}
          >
            <path d="M7 10l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div
          className={cn(
            "grid transition-all duration-300 ease-in-out",
            isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
          )}
        >
          <div className="overflow-hidden min-h-0">
            <div className={cn("px-6 pb-4 leading-relaxed", contentClassName)}>
              {content}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Multi-item mode: items array
  if (!items) return null;

  return (
    <div className={cn("space-y-3", className)}>
      {items.map((item) => {
        const isOpen = openItems.includes(item.id);

        return (
          <div
            key={item.id}
            className="bg-white border border-[#E2E8F0] rounded-[16px] overflow-hidden"
          >
            <button
              onClick={() => toggleItem(item.id)}
              className="w-full px-6 py-5 flex items-center justify-between text-left transition-colors hover:bg-[#F8FAFC]"
              aria-expanded={isOpen}
              aria-controls={`accordion-content-${item.id}`}
            >
              <span className="font-semibold text-[#0F172A] pr-4">
                {item.question}
              </span>
              <div className={cn(
                "w-5 h-5 transition-transform duration-300 flex-shrink-0",
                isOpen && "rotate-180"
              )}>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-full h-full"
                >
                  <path
                    d="M7 10l5 5 5-5"
                    stroke={isOpen ? "#EF4444" : "#22D3EE"}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </button>
            <div
              id={`accordion-content-${item.id}`}
              className={cn(
                "grid transition-all duration-300 ease-in-out",
                isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
              )}
              role="region"
              aria-labelledby={`accordion-button-${item.id}`}
            >
              <div className="overflow-hidden min-h-0">
                <div className="px-6 pb-5 text-[#475569] leading-relaxed">
                  {item.answer}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export { Accordion };
