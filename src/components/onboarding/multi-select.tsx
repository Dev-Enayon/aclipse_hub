"use client";

import { useState } from "react";

export function MultiSelect({
  options,
  selected,
  onChange,
  allowCustom = true,
  placeholder = "Add an item...",
}: {
  options: readonly string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  allowCustom?: boolean;
  placeholder?: string;
}) {
  const [customInput, setCustomInput] = useState("");

  const toggle = (option: string) => {
    if (selected.includes(option)) {
      onChange(selected.filter((s) => s !== option));
    } else {
      onChange([...selected, option]);
    }
  };

  const addCustom = () => {
    const value = customInput.trim();
    if (value && !selected.includes(value)) {
      onChange([...selected, value]);
    }
    setCustomInput("");
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-2">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => toggle(option)}
            aria-pressed={selected.includes(option)}
            className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
              selected.includes(option)
                ? "bg-primary text-white border-primary"
                : "bg-white text-gray-700 border-gray-300 hover:border-primary hover:text-primary"
            }`}
          >
            {option}
          </button>
        ))}
      </div>

      {selected.filter((s) => !options.includes(s)).length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {selected
            .filter((s) => !options.includes(s))
            .map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => toggle(s)}
                className="px-3 py-1.5 rounded-full text-sm bg-accent text-white border border-accent"
              >
                {s} ✕
              </button>
            ))}
        </div>
      )}

      {allowCustom && (
        <div className="flex gap-2">
          <input
            type="text"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustom();
              }
            }}
            placeholder={placeholder}
            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-gray-900 placeholder-gray-400 bg-white"
          />
          <button
            type="button"
            onClick={addCustom}
            className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Add
          </button>
        </div>
      )}
    </div>
  );
}
