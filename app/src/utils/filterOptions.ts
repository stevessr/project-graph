export type SelectOption = {
  label: string;
  value: string;
};

export type SelectOptionGroup = {
  label: string;
  options: SelectOption[];
};

export function isOptionGroup(option: SelectOption | SelectOptionGroup): option is SelectOptionGroup {
  return "options" in option;
}

/**
 * Filters an array of options or option groups based on a search term.
 *
 * @param options The array of options to filter.
 * @param searchTerm The term to search for.
 * @returns A filtered array of options.
 */
export function filterOptions(
  options: (SelectOption | SelectOptionGroup)[],
  searchTerm: string,
): (SelectOption | SelectOptionGroup)[] {
  if (!searchTerm) {
    return options;
  }

  const lowerCaseSearchTerm = searchTerm.toLowerCase();

  return options.reduce((acc, option) => {
    if (isOptionGroup(option)) {
      const filteredOptions = option.options.filter((o) => o.label.toLowerCase().includes(lowerCaseSearchTerm));
      if (filteredOptions.length > 0) {
        acc.push({ ...option, options: filteredOptions });
      }
    } else if (option.label.toLowerCase().includes(lowerCaseSearchTerm)) {
      acc.push(option);
    }
    return acc;
  }, [] as (SelectOption | SelectOptionGroup)[]);
}