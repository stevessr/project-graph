import { ChevronDown } from "lucide-react";
import React from "react";
import { cn } from "../utils/cn"; // Assuming this path is correct
import Box from "./Box"; // Assuming this path is correct

// Define the option type more explicitly
interface SelectOption {
  label: string;
  value: string;
  disabled?: boolean; // Added disabled property for individual options
}

export default function Select({
  className = "",
  value = "",
  onChange = () => {},
  options = [],
  disabled = false, // Top-level disabled prop
  ...props
}: {
  className?: string;
  value?: string;
  onChange?: (value: string) => void;
  options?: SelectOption[];
  disabled?: boolean;
  [key: string]: any;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [dropdownX, setDropdownX] = React.useState(0);
  const [dropdownY, setDropdownY] = React.useState(0);
  const [showDropdown, setShowDropdown] = React.useState(false);

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (disabled) return; // Prevent opening if the whole select is disabled

    event.preventDefault();
    event.stopPropagation();

    if (ref.current) {
      const { left, width, bottom } = ref.current.getBoundingClientRect();
      setDropdownX(left + width / 2);
      setDropdownY(bottom + 8);
    }
    setShowDropdown((prevShow) => !prevShow); // Toggle based on previous state

    // Add listeners only if dropdown is being opened
    if (!showDropdown) {
      document.addEventListener("pointerdown", handleDocumentClick);
      document.addEventListener("wheel", handleWheel);
    } else {
      // Remove if dropdown is being closed by clicking the select again
      document.removeEventListener("pointerdown", handleDocumentClick);
      document.removeEventListener("wheel", handleWheel);
    }
  };

  const handleDocumentClick = React.useCallback(() => {
    setShowDropdown(false);
    document.removeEventListener("pointerdown", handleDocumentClick);
    document.removeEventListener("wheel", handleWheel);
  }, []); // Added useCallback for stable function reference

  const handleWheel = React.useCallback(() => {
    setShowDropdown(false);
    document.removeEventListener("pointerdown", handleDocumentClick);
    document.removeEventListener("wheel", handleWheel);
  }, [handleDocumentClick]); // Added useCallback and dependency

  // Effect to cleanup listeners when component unmounts or showDropdown changes
  React.useEffect(() => {
    if (!showDropdown) {
      document.removeEventListener("pointerdown", handleDocumentClick);
      document.removeEventListener("wheel", handleWheel);
    }
    // Cleanup on unmount
    return () => {
      document.removeEventListener("pointerdown", handleDocumentClick);
      document.removeEventListener("wheel", handleWheel);
    };
  }, [showDropdown, handleDocumentClick, handleWheel]);

  const selectedOptionLabel = options.find((option) => option.value === value)?.label || "Select...";

  return (
    <>
      <Box
        className={cn(
          "group/select bg-select-bg text-select-text border-select-border flex appearance-none items-center justify-between gap-1 px-3 py-2 pl-4",
          !disabled && "hover:cursor-pointer hover:opacity-80", // Apply hover styles only if not disabled
          disabled && "cursor-not-allowed opacity-50", // Styles for disabled select
          className,
        )}
        ref={ref}
        onClick={handleClick}
        tabIndex={disabled ? -1 : 0} // Make it non-focusable when disabled
        aria-disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={showDropdown}
        {...props}
      >
        {selectedOptionLabel}
        <ChevronDown
          className={cn(
            "h-4 w-4 transition-transform duration-200 ease-in-out",
            !disabled && "group-active/select:translate-y-1", // Apply active style only if not disabled
            showDropdown && "rotate-180",
          )}
        />
      </Box>
      {/* 展开的下拉框 */}
      <div
        role="listbox"
        className={cn(
          "border-select-popup-border bg-select-popup-bg shadow-select-popup-shadow fixed z-[104] flex w-max min-w-[--radix-select-trigger-width] origin-top -translate-x-1/2 flex-col rounded-lg border p-2 shadow-lg transition-all duration-200 ease-in-out",
          // Using data attributes for state is often cleaner for Tailwind
          "data-[state=closed]:scale-0 data-[state=closed]:opacity-0",
          "data-[state=open]:scale-100 data-[state=open]:opacity-100",
        )}
        data-state={showDropdown ? "open" : "closed"}
        style={{
          left: dropdownX,
          top: dropdownY,
        }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {options.length > 0 ? (
          options.map((option) => (
            <button
              key={option.value}
              role="option"
              aria-selected={option.value === value}
              disabled={option.disabled}
              className={cn(
                "rounded-lg border px-3 py-2 text-left",
                !option.disabled && [
                  "bg-select-option-bg text-select-option-text border-select-option-border",
                  "hover:bg-select-option-hover-bg hover:border-select-option-hover-border hover:text-select-option-hover-text hover:cursor-pointer",
                ],
                option.value === value &&
                  !option.disabled && [
                    "bg-select-option-selected-bg text-select-option-selected-text border-select-option-selected-border",
                    "hover:bg-select-option-selected-hover-bg hover:text-select-option-selected-hover-text hover:border-select-option-selected-hover-border",
                  ],
                option.value !== value && !option.disabled && "active:scale-95",
                option.disabled &&
                  "bg-select-option-bg text-select-option-text border-select-option-border cursor-not-allowed opacity-50",
              )}
              onClick={() => {
                onChange(option.value);
                setShowDropdown(false);
              }}
            >
              {option.label}
            </button>
          ))
        ) : (
          <div className="text-select-option-text px-3 py-2 text-sm">啥也没有</div>
        )}
      </div>
    </>
  );
}
