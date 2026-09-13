// src/lib/utils/format.ts
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(date: string | Date): string {
  const d = new Date(date)
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

export function parseFlexibleDate(input: string): string | null {
  // Remove all non-digit characters
  const digits = input.replace(/\D/g, '')
  
  // Handle different date formats
  if (digits.length === 6) {
    // DDMMYY format
    const day = digits.substring(0, 2)
    const month = digits.substring(2, 4)
    const year = '20' + digits.substring(4, 6)
    return `${year}-${month}-${day}`
  } else if (digits.length === 8) {
    // DDMMYYYY format
    const day = digits.substring(0, 2)
    const month = digits.substring(2, 4)
    const year = digits.substring(4, 8)
    return `${year}-${month}-${day}`
  }
  
  return null
}

export function autoFormatDateInput(input: string): string {
  // Auto-format as user types: DD/MM/YYYY
  const digits = input.replace(/\D/g, '')
  
  if (digits.length <= 2) {
    return digits
  } else if (digits.length <= 4) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`
  } else {
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`
  }
}