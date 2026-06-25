'use client'

import { useState, useRef, useEffect } from 'react'

interface Props {
  value: string
  onChange: (value: string) => void
  suggestions: string[]
  placeholder?: string
  className?: string
  label?: string
}

export default function AutocompleteInput({
  value,
  onChange,
  suggestions,
  placeholder,
  className,
  label,
}: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const filtered = suggestions.filter((s) =>
    s && value.length >= 2 && s.toLowerCase().includes(value.toLowerCase())
  )

  useEffect(() => {
    if (value && filtered.length > 0) {
      setOpen(true)
    }
  }, [value, filtered.length])

  return (
    <div ref={ref} className="relative">
      {label && (
        <label className="block text-sm font-medium text-[#B0B0D0] mb-1">
          {label}
        </label>
      )}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => {
          if (filtered.length > 0) setOpen(true)
        }}
        placeholder={placeholder}
        className={className}
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 w-full mt-1 rounded-xl bg-[#1A1A3A] border border-white/10 max-h-48 overflow-y-auto shadow-xl">
          {filtered.map((s) => (
            <button
              key={s}
              type="button"
              className="w-full text-left px-3 py-2 text-sm text-white hover:bg-white/10 transition-colors first:rounded-t-xl last:rounded-b-xl"
              onMouseDown={(e) => {
                e.preventDefault()
                onChange(s)
                setOpen(false)
              }}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
