// src/components/shared/date-picker.tsx
"use client"

import * as React from "react"
import { Calendar as CalendarIcon, X, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface DatePickerProps {
  value: string
  onChange: (date: string) => void
  placeholder?: string
  className?: string
}

export function DatePicker({ value, onChange, placeholder = "DD/MM/YYYY", className }: DatePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState('')
  const [viewDate, setViewDate] = React.useState(new Date())
  const [errorMessage, setErrorMessage] = React.useState('')
  const containerRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)

  // Update input value when value prop changes
  React.useEffect(() => {
    if (value) {
      // Convert YYYY-MM-DD to DD/MM/YYYY for display
      const parts = value.split('-')
      if (parts.length === 3) {
        const year = parts[0]
        const month = parts[1]
        const day = parts[2]
        setInputValue(`${day}/${month}/${year}`)
        setViewDate(new Date(parseInt(year), parseInt(month) - 1, parseInt(day)))
      }
    }
  }, [value])

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const parseDateInput = (input: string): Date | null => {
    // Remove all non-digits
    const digits = input.replace(/\D/g, '')
    
    let day: number, month: number, year: number
    
    if (digits.length === 6) {
      // DDMMYY format - 010926 means 01/09/2026
      day = parseInt(digits.substring(0, 2), 10)
      month = parseInt(digits.substring(2, 4), 10)
      const yy = parseInt(digits.substring(4, 6), 10)
      year = 2000 + yy  // Always assume 2000s for simplicity
    } else if (digits.length === 8) {
      // DDMMYYYY format - 01092026 means 01/09/2026
      day = parseInt(digits.substring(0, 2), 10)
      month = parseInt(digits.substring(2, 4), 10)
      year = parseInt(digits.substring(4, 8), 10)
    } else {
      return null
    }
    
    // Validate
    if (month < 1 || month > 12) return null
    if (day < 1 || day > 31) return null
    if (year < 2000 || year > 2100) return null
    
    const date = new Date(year, month - 1, day)
    
    // Check if date is valid (e.g., not Feb 30)
    if (date.getDate() !== day || date.getMonth() !== month - 1 || date.getFullYear() !== year) {
      return null
    }
    
    return date
  }

  const formatDateForDisplay = (date: Date): string => {
    const day = date.getDate().toString().padStart(2, '0')
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const year = date.getFullYear().toString()
    return `${day}/${month}/${year}`
  }

  const formatDateForStorage = (date: Date): string => {
    const day = date.getDate().toString().padStart(2, '0')
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const year = date.getFullYear().toString()
    return `${year}-${month}-${day}`
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value
    const digits = rawValue.replace(/\D/g, '')
    
    // Auto-format as user types
    let formatted = ''
    if (digits.length <= 2) {
      formatted = digits
    } else if (digits.length <= 4) {
      formatted = `${digits.slice(0, 2)}/${digits.slice(2)}`
    } else if (digits.length <= 6) {
      formatted = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 6)}`
    } else {
      formatted = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`
    }
    
    setInputValue(formatted)
    setErrorMessage('')
    // Yahan par kuch validate nahi karenge, sirf Enter par karenge
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault() // Form submit hone se bachaye
      
      const digits = inputValue.replace(/\D/g, '')
      console.log('Enter pressed, digits:', digits) // Debug log
      
      if (digits.length === 6 || digits.length === 8) {
        const date = parseDateInput(digits)
        if (date) {
          setInputValue(formatDateForDisplay(date))
          setViewDate(date)
          onChange(formatDateForStorage(date))
          setErrorMessage('')
          setIsOpen(false)
          console.log('Date selected:', formatDateForStorage(date)) // Debug log
        } else {
          setErrorMessage('Invalid date')
        }
      } else {
        setErrorMessage('Please enter complete date (DDMMYY or DDMMYYYY)')
      }
    }
  }

  const handleDateSelect = (date: Date) => {
    setInputValue(formatDateForDisplay(date))
    setViewDate(date)
    onChange(formatDateForStorage(date))
    setIsOpen(false)
    setErrorMessage('')
  }

  const handleClear = () => {
    setInputValue('')
    setErrorMessage('')
    onChange('')
    inputRef.current?.focus()
  }

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  }

  const handlePrevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))
  }

  const handleNextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))
  }

  const handlePrevYear = () => {
    setViewDate(new Date(viewDate.getFullYear() - 1, viewDate.getMonth(), 1))
  }

  const handleNextYear = () => {
    setViewDate(new Date(viewDate.getFullYear() + 1, viewDate.getMonth(), 1))
  }

  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"]
  
  const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

  // Get selected date for highlighting
  const selectedDate = value ? new Date(value + 'T00:00:00') : null

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative">
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onClick={() => setIsOpen(true)}
          placeholder={placeholder}
          className={cn(
            "pr-16 cursor-pointer",
            errorMessage && "border-red-500",
            className
          )}
        />
        <div className="absolute right-0 top-0 h-full flex items-center">
          {inputValue && (
            <button
              type="button"
              onClick={handleClear}
              className="h-full px-2 flex items-center hover:text-gray-700"
            >
              <X className="h-4 w-4 text-gray-400" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="h-full px-2 flex items-center"
          >
            <CalendarIcon className="h-4 w-4 text-gray-500" />
          </button>
        </div>
      </div>
      
      {errorMessage && (
        <p className="text-xs text-red-500 mt-1">{errorMessage}</p>
      )}
      
      {isOpen && (
        <div className="absolute z-50 mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl w-[320px]">
          {/* Calendar Header */}
          <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-1">
              <button
                type="button"
                onClick={handlePrevYear}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
              >
                <ChevronLeft className="h-4 w-4" />
                <ChevronLeft className="h-4 w-4 -ml-2" />
              </button>
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>
            
            <div className="text-sm font-medium">
              {monthNames[viewDate.getMonth()]} {viewDate.getFullYear()}
            </div>
            
            <div className="flex items-center space-x-1">
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleNextYear}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
              >
                <ChevronRight className="h-4 w-4" />
                <ChevronRight className="h-4 w-4 -ml-2" />
              </button>
            </div>
          </div>
          
          {/* Day Names */}
          <div className="grid grid-cols-7 gap-1 p-2">
            {dayNames.map(day => (
              <div key={day} className="text-center text-xs font-medium text-gray-500 py-1">
                {day}
              </div>
            ))}
          </div>
          
          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-1 px-2 pb-2">
            {Array.from({ length: getFirstDayOfMonth(viewDate) }).map((_, i) => (
              <div key={`empty-${i}`} className="h-8" />
            ))}
            
            {Array.from({ length: getDaysInMonth(viewDate) }).map((_, i) => {
              const day = i + 1
              const date = new Date(viewDate.getFullYear(), viewDate.getMonth(), day)
              const isSelected = selectedDate && 
                selectedDate.getDate() === day &&
                selectedDate.getMonth() === viewDate.getMonth() &&
                selectedDate.getFullYear() === viewDate.getFullYear()
              
              const isToday = 
                new Date().getDate() === day &&
                new Date().getMonth() === viewDate.getMonth() &&
                new Date().getFullYear() === viewDate.getFullYear()
              
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleDateSelect(date)}
                  className={cn(
                    "h-8 w-8 mx-auto flex items-center justify-center text-sm rounded-full transition-colors",
                    isSelected
                      ? "bg-[#FF6B00] text-white font-medium"
                      : isToday
                      ? "bg-orange-100 text-[#FF6B00] font-medium"
                      : "hover:bg-gray-100 dark:hover:bg-gray-800"
                  )}
                >
                  {day}
                </button>
              )
            })}
          </div>
          
          {/* Footer */}
          <div className="flex justify-between items-center p-3 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => handleDateSelect(new Date())}
              className="text-sm text-[#FF6B00] hover:underline"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-sm text-gray-500 hover:underline"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}