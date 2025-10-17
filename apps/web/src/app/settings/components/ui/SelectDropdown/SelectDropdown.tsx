// apps/web/src/app/settings/components/ui/SelectDropdown/SelectDropdown.tsx
'use client'

import React from 'react'
import styles from './SelectDropdown.module.css'

interface SelectOption {
  value: string
  label: string
}

interface SelectDropdownProps {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  'aria-label'?: string
  className?: string
}

export function SelectDropdown({ 
  value, 
  onChange, 
  options, 
  className = '',
  ...props 
}: SelectDropdownProps) {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(e.target.value)
  }

  const combinedClassName = `${styles.select} ${className}`.trim()

  return (
    <select
      value={value}
      onChange={handleChange}
      className={combinedClassName}
      {...props}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}