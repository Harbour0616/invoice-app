"use client";

import { useState, useRef, useEffect } from "react";

type Option = {
  value: string;
  label: string;
  sublabel?: string;
};

type ComboboxProps = {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
};

export function Combobox({
  options,
  value,
  onChange,
  placeholder = "選択...",
  className = "",
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [highlightIndex, setHighlightIndex] = useState(0);

  const selectedOption = options.find((o) => o.value === value);

  const filtered = options.filter((o) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      o.label.toLowerCase().includes(s) ||
      (o.sublabel && o.sublabel.toLowerCase().includes(s))
    );
  });

  useEffect(() => {
    setHighlightIndex(0);
  }, [search]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (val: string) => {
    onChange(val);
    setOpen(false);
    setSearch("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightIndex((prev) => Math.min(prev + 1, filtered.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightIndex((prev) => Math.max(prev - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (filtered[highlightIndex]) {
          handleSelect(filtered[highlightIndex].value);
        }
        break;
      case "Escape":
        setOpen(false);
        setSearch("");
        break;
      case "Tab":
        if (filtered[highlightIndex]) {
          handleSelect(filtered[highlightIndex].value);
        }
        setOpen(false);
        setSearch("");
        break;
    }
  };

  // スクロールでハイライト項目を追従
  useEffect(() => {
    if (open && listRef.current) {
      const items = listRef.current.querySelectorAll("[data-option]");
      items[highlightIndex]?.scrollIntoView({ block: "nearest" });
    }
  }, [highlightIndex, open]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <input
        ref={inputRef}
        type="text"
        value={open ? search : selectedOption?.label || ""}
        onChange={(e) => {
          setSearch(e.target.value);
          if (!open) setOpen(true);
        }}
        onFocus={() => {
          setOpen(true);
          setSearch("");
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="input-bordered"
      />
      {open && (
        <div
          ref={listRef}
          className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto bg-card rounded-[10px] shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-border"
        >
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-sub-text">該当なし</div>
          ) : (
            filtered.map((option, idx) => (
              <div
                key={option.value}
                data-option
                onClick={() => handleSelect(option.value)}
                className={`py-2.5 px-3 text-sm cursor-pointer rounded-lg mx-1 ${
                  idx === highlightIndex
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-muted"
                } ${option.value === value && idx !== highlightIndex ? "font-medium" : ""}`}
              >
                <span>{option.label}</span>
                {option.sublabel && (
                  <span
                    className={`ml-2 text-xs ${
                      idx === highlightIndex ? "text-primary/60" : "text-sub-text"
                    }`}
                  >
                    {option.sublabel}
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
