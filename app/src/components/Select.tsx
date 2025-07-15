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
  const [dropdownWidth, setDropdownWidth] = React.useState(0); // Add state for width
  const [showDropdown, setShowDropdown] = React.useState(false);

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (disabled) return; // Prevent opening if the whole select is disabled

    event.preventDefault();
    event.stopPropagation();

    if (ref.current) {
      const { left, width, bottom } = ref.current.getBoundingClientRect();
      setDropdownX(left); // Align to the left edge
      setDropdownY(bottom + 8);
      setDropdownWidth(width); // Set the width
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
  const selectedOptionValue =
    options.find((option) => option.value == value)?.label ||
    options.find((option) => option.value)?.value ||
    "Selcet...";

  return (
    <>
      <Box
        className={cn(
          "group/select el-select flex appearance-none items-center justify-between gap-1 px-3 py-2 pl-4 hover:cursor-pointer hover:opacity-80",
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
        {selectedOptionValue}
        <ChevronDown
          className={cn(
            "h-4 w-4 transition-transform duration-200 ease-in-out",
            !disabled && "group-active/select:translate-y-1", // Apply active style only if not disabled
            showDropdown && "rotate-180",
          )}
        />
      </Box>
      <div
        role="listbox"
        className={cn(
          // w-max: 防止下拉框在页面右侧时，宽度不够而缩小
          "el-select-popup fixed z-[104] flex w-max origin-top -translate-x-1/2 scale-0 flex-col rounded-lg border p-2 opacity-0 shadow-lg",
          {
            "scale-100 opacity-100": showDropdown,
          },
        )}
        data-state={showDropdown ? "open" : "closed"}
        style={{
          left: dropdownX,
          top: dropdownY,
          width: dropdownWidth,
        }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {options.map((option) => (
          <button
            key={option.value}
            className={cn("el-select-option rounded-lg border px-3 py-2 hover:cursor-pointer", {
              "el-select-option-selected": option.value === value,
              "active:scale-90": option.value !== value,
            })}
            onClick={() => {
              onChange(option.value);
              setShowDropdown(false);
              document.removeEventListener("pointerdown", handleDocumentClick);
              document.removeEventListener("wheel", handleDocumentClick);
            }}
          >
            {option.label}
          </button>
        ))}
      </div>
    </>
  );
}
