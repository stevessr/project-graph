import { ChevronDown } from "lucide-react";
import React, { useMemo, useState } from "react";
import { cn } from "../utils/cn";
import { filterOptions, SelectOption, SelectOptionGroup, isOptionGroup } from "../utils/filterOptions";
import Box from "./Box";
import Input from "./Input";

export type { SelectOption, SelectOptionGroup };

export default function Select({
  className = "",
  value: controlledValue = "",
  onUpdate = () => {},
  options = [],
  allowCustom = false,
  searchable = false,
  ...props
}: {
  className?: string;
  value?: string;
  onUpdate?: (value: string) => void;
  options?: (SelectOption | SelectOptionGroup)[];
  allowCustom?: boolean;
  searchable?: boolean;
  [key: string]: any;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [dropdownX, setDropdownX] = useState(0);
  const [dropdownY, setDropdownY] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentValue, setCurrentValue] = useState(controlledValue);

  React.useEffect(() => {
    setCurrentValue(controlledValue);
  }, [controlledValue]);

  const filteredOptions = useMemo(() => {
    return filterOptions(options, searchTerm);
  }, [options, searchTerm]);

  const displayLabel = useMemo(() => {
    for (const option of options) {
      if (isOptionGroup(option)) {
        const selected = option.options.find((o) => o.value === currentValue);
        if (selected) {
          return selected.label;
        }
      } else if (option.value === currentValue) {
        return option.label;
      }
    }
    return currentValue;
  }, [currentValue, options]);

  const handleSelect = (newValue: string) => {
    onUpdate(newValue);
    setCurrentValue(newValue);
    setShowDropdown(false);
    setSearchTerm("");
  };

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const { left, width, bottom } = ref.current!.getBoundingClientRect();
    setDropdownX(left + width / 2);
    setDropdownY(bottom + 8);
    setShowDropdown(!showDropdown);
    document.addEventListener("pointerdown", handleDocumentClick);
    document.addEventListener("wheel", handleWheel);
  };

  const handleDocumentClick = () => {
    setShowDropdown(false);
    document.removeEventListener("pointerdown", handleDocumentClick);
    document.removeEventListener("wheel", handleWheel);
  };

  const handleWheel = () => {
    setShowDropdown(false);
  };

  return (
    <>
      <Box
        className={cn(
          "group/select el-select flex appearance-none items-center justify-between gap-1 px-3 py-2 pl-4 hover:cursor-pointer hover:opacity-80",
          className,
        )}
        ref={ref}
        onClick={handleClick}
        {...props}
      >
        {displayLabel}
        <ChevronDown
          className={cn("h-4 w-4 group-active/select:translate-y-1 hover:cursor-pointer", {
            "rotate-180": showDropdown,
          })}
        />
      </Box>
      <div
        className={cn(
          "el-select-popup fixed z-[104] flex w-max origin-top -translate-x-1/2 scale-0 flex-col rounded-lg border p-2 opacity-0 shadow-lg",
          { "scale-100 opacity-100": showDropdown },
        )}
        style={{
          left: dropdownX,
          top: dropdownY,
        }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {searchable && (
          <Input
            autoFocus
            className="mb-2"
            placeholder="Search..."
            value={searchTerm}
            onInput={(e: React.FormEvent<HTMLInputElement>) => setSearchTerm(e.currentTarget.value)}
          />
        )}
        <div className="flex flex-col">
          {filteredOptions.map((option) =>
            isOptionGroup(option) ? (
              <div key={option.label} className="el-select-group">
                <strong className="el-select-group-title px-3 py-2 text-sm font-semibold">{option.label}</strong>
                <div className="flex flex-col">
                  {option.options.map((o) => (
                    <button
                      key={o.value}
                      className={cn("el-select-option rounded-lg border px-3 py-2 hover:cursor-pointer", {
                        "el-select-option-selected": o.value === currentValue,
                        "active:scale-90": o.value !== currentValue,
                      })}
                      onClick={() => handleSelect(o.value)}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <button
                key={option.value}
                className={cn("el-select-option rounded-lg border px-3 py-2 hover:cursor-pointer", {
                  "el-select-option-selected": option.value === currentValue,
                  "active:scale-90": option.value !== currentValue,
                })}
                onClick={() => handleSelect(option.value)}
              >
                {option.label}
              </button>
            ),
          )}
        </div>
        {allowCustom &&
          searchTerm &&
          !filteredOptions.some((o) =>
            isOptionGroup(o) ? o.options.some((c) => c.label === searchTerm) : o.label === searchTerm,
          ) && (
            <button
              className="el-select-option rounded-lg border px-3 py-2 hover:cursor-pointer"
              onClick={() => handleSelect(searchTerm)}
            >
              Use custom value: "{searchTerm}"
            </button>
          )}
      </div>
    </>
  );
}
