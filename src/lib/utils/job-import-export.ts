// src/lib/utils/job-import-export.ts
import ExcelJS from 'exceljs'
import Papa from 'papaparse'
import { supabase } from '@/lib/supabase/client'

export interface ImportRow {
  rowIndex: number
  date: string              // Display format DD/MM/YYYY
  dateIso: string | null    // Parsed ISO for DB insert
  client_name: string
  product_name: string
  job_details: string
  paper_qty: string
  colors: string
  print_qty: string
  rate: string
  total: string
  status: string
  payment_status: string
  matched_client_id?: string
  matched_product_id?: string
  errors: string[]
  warnings: string[]
  isDuplicate?: boolean
  _skip?: boolean
}

export interface ExportOptions {
  jobs: any[]
  clients: { id: string, display: string }[]
  products: { id: string, name: string, client_id: string, display: string }[]
  fileName?: string
}

const DATE_FORMAT_REGEX = /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/

/**
 * Parse a flexible date string to YYYY-MM-DD
 * Handles: DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY, DDMMYY, DDMMYYYY,
 *          ISO YYYY-MM-DD, Excel Date objects, Excel serial numbers
 * Assumes Pakistani format (DD/MM/YYYY) when ambiguous
 */
export function parseFlexibleDate(input: string | Date | number): string | null {
  if (!input && input !== 0) return null

  // If it's a Date object (Excel auto-converts sometimes)
  if (input instanceof Date) {
    if (isNaN(input.getTime())) return null
    const y = input.getUTCFullYear()
    const m = String(input.getUTCMonth() + 1).padStart(2, '0')
    const d = String(input.getUTCDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  const str = String(input).trim()
  if (!str) return null

  // Already ISO: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return str.substring(0, 10)
  }

  // Try DD/MM/YYYY or similar
  const match = str.match(DATE_FORMAT_REGEX)
  if (match) {
    const a = parseInt(match[1])
    const b = parseInt(match[2])
    let year = parseInt(match[3])
    if (year < 100) year = 2000 + year

    let day: number
    let month: number

    if (a > 12 && b <= 12) {
      // a must be day: DD/MM
      day = a
      month = b
    } else if (b > 12 && a <= 12) {
      // b must be day: it's MM/DD format (unusual), swap
      day = b
      month = a
    } else {
      // Both <= 12: assume Pakistani DD/MM
      day = a
      month = b
    }

    if (month < 1 || month > 12) return null
    if (day < 1 || day > 31) return null

    // Validate real date
    const testDate = new Date(year, month - 1, day)
    if (testDate.getFullYear() !== year || testDate.getMonth() !== month - 1 || testDate.getDate() !== day) {
      return null
    }

    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  // Excel serial number
  if (/^\d+$/.test(str)) {
    const serial = parseInt(str)
    if (serial > 20000 && serial < 60000) {
      const excelEpoch = new Date(Date.UTC(1899, 11, 30))
      const date = new Date(excelEpoch.getTime() + serial * 86400000)
      return date.toISOString().split('T')[0]
    }
  }

  return null
}

/**
 * Convert ISO date (YYYY-MM-DD) to display (DD/MM/YYYY)
 */
function toDisplayDate(isoDate: string): string {
  if (!isoDate) return ''
  const parts = isoDate.split('-')
  if (parts.length !== 3) return isoDate
  return `${parts[2]}/${parts[1]}/${parts[0]}`
}

// ============================================
// EXPORT — Excel with dropdowns (using exceljs)
// ============================================

export async function exportJobsToExcel(options: ExportOptions): Promise<void> {
  const { jobs, clients, products, fileName } = options

  const clientNames = clients.map(c => c.display).filter(Boolean).sort()
  const productNames = products.map(p => p.display).filter(Boolean).sort()
  const statusList = ['new', 'in_process', 'completed']
  const paymentStatusList = ['unpaid', 'partial', 'paid']

  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'BinFazal Enterprises'
  workbook.created = new Date()

  // ============ JOBS SHEET ============
  const worksheet = workbook.addWorksheet('Jobs')

  worksheet.columns = [
    { header: 'Date', key: 'date', width: 14 },
    { header: 'Client Name', key: 'client', width: 35 },
    { header: 'Product Name', key: 'product', width: 35 },
    { header: 'Job Details', key: 'details', width: 45 },
    { header: 'Paper Qty', key: 'paper_qty', width: 12 },
    { header: 'Colors', key: 'colors', width: 10 },
    { header: 'Print Qty', key: 'print_qty', width: 14 },
    { header: 'Rate', key: 'rate', width: 12 },
    { header: 'Total', key: 'total', width: 14 },
    { header: 'Status', key: 'status', width: 14 },
    { header: 'Payment Status', key: 'payment_status', width: 16 },
  ]

  // Style headers
  const headerRow = worksheet.getRow(1)
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFF6B00' },
  }
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' }
  headerRow.height = 24

  // Add existing jobs
  jobs.forEach(j => {
    worksheet.addRow({
      date: toDisplayDate(j.job_date),
      client: j.clients?.company_name || `${j.clients?.first_name || ''} ${j.clients?.last_name || ''}`.trim(),
      product: j.product_name || '',
      details: j.job_details || '',
      paper_qty: j.paper_qty || 0,
      colors: j.colors_qty || 1,
      print_qty: j.print_qty || 0,
      rate: j.rate || 0,
      total: j.total_amount || 0,
      status: j.status || 'new',
      payment_status: j.payment_status || 'unpaid',
    })
  })

  // Add empty rows
  const emptyRowsCount = 20
  for (let i = 0; i < emptyRowsCount; i++) {
    worksheet.addRow({})
  }

  const maxRow = worksheet.rowCount

  // Format date column as text
  for (let i = 2; i <= maxRow; i++) {
    const cell = worksheet.getCell(`A${i}`)
    cell.numFmt = '@'
    cell.alignment = { horizontal: 'center' }
  }

  // Add Total formula (auto-calc)
  for (let i = 2; i <= maxRow; i++) {
    worksheet.getCell(`I${i}`).value = {
      formula: `IF(AND(G${i}>0,H${i}>0),G${i}*H${i},"")`
    }
    worksheet.getCell(`I${i}`).numFmt = '#,##0.00'
  }

  // ============ DATA VALIDATIONS ============

  // Client dropdown (column B)
  if (clientNames.length > 0 && clientNames.length <= 100) {
    for (let i = 2; i <= maxRow; i++) {
      worksheet.getCell(`B${i}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`"${clientNames.join(',').replace(/"/g, '')}"`],
        showErrorMessage: true,
        errorTitle: 'Invalid Client',
        error: 'Please select a client from the dropdown',
        showInputMessage: true,
        promptTitle: 'Client',
        prompt: 'Select a client from the dropdown',
      }
    }
  }

  // Product dropdown (column C)
  if (productNames.length > 0 && productNames.length <= 100) {
    for (let i = 2; i <= maxRow; i++) {
      worksheet.getCell(`C${i}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`"${productNames.join(',').replace(/"/g, '')}"`],
        showErrorMessage: false,
        showInputMessage: true,
        promptTitle: 'Product',
        prompt: 'Optional — select to auto-fill details',
      }
    }
  }

  // Status dropdown (column J)
  for (let i = 2; i <= maxRow; i++) {
    worksheet.getCell(`J${i}`).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: [`"${statusList.join(',')}"`],
      showErrorMessage: true,
      errorTitle: 'Invalid Status',
      error: 'Choose: new, in_process, or completed',
    }
  }

  // Payment Status dropdown (column K)
  for (let i = 2; i <= maxRow; i++) {
    worksheet.getCell(`K${i}`).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: [`"${paymentStatusList.join(',')}"`],
      showErrorMessage: true,
      errorTitle: 'Invalid Payment Status',
      error: 'Choose: unpaid, partial, or paid',
    }
  }

  // ============ INSTRUCTIONS SHEET ============
  const instructionsSheet = workbook.addWorksheet('Instructions')
  instructionsSheet.columns = [{ width: 80 }]

  const instructions = [
    'BinFazal Enterprises - Job Import Template',
    '',
    'HOW TO USE:',
    '1. Fill in the "Jobs" sheet with your print jobs',
    '2. Date format: DD/MM/YYYY (example: 29/09/2026)',
    '3. Client Name — pick from dropdown (required)',
    '4. Product Name — pick from dropdown (optional)',
    '5. Total is auto-calculated from Print Qty × Rate',
    '6. Status: new, in_process, completed',
    '7. Payment Status: unpaid, partial, paid',
    '',
    'TIPS:',
    '- Save as .xlsx or export as CSV',
    '- Add as many rows as you need',
    '- Delete the sample row before uploading',
    '- Date is interpreted as DD/MM/YYYY',
  ]

  instructions.forEach((line, idx) => {
    const row = instructionsSheet.addRow([line])
    if (idx === 0) {
      row.font = { bold: true, size: 14, color: { argb: 'FFFF6B00' } }
    } else if (line.startsWith('HOW TO USE:') || line.startsWith('TIPS:')) {
      row.font = { bold: true, size: 12 }
    }
  })

  // ============ WRITE FILE ============
  const finalFileName = fileName || `BinFazal_Jobs_${new Date().toISOString().split('T')[0]}.xlsx`
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = finalFileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Export jobs to CSV (plain, no dropdowns)
 */
export function exportJobsToCSV(options: ExportOptions): void {
  const { jobs, fileName } = options

  const rows = jobs.map(j => ({
    'Date': toDisplayDate(j.job_date),
    'Client Name': j.clients?.company_name || `${j.clients?.first_name || ''} ${j.clients?.last_name || ''}`.trim(),
    'Product Name': j.product_name || '',
    'Job Details': j.job_details || '',
    'Paper Qty': j.paper_qty || '',
    'Colors': j.colors_qty || '',
    'Print Qty': j.print_qty || '',
    'Rate': j.rate || '',
    'Total': j.total_amount || '',
    'Status': j.status || '',
    'Payment Status': j.payment_status || '',
  }))

  if (rows.length === 0) {
    rows.push({
      'Date': '01/01/2026',
      'Client Name': '',
      'Product Name': '',
      'Job Details': 'Sample - delete this row',
      'Paper Qty': '',
      'Colors': '',
      'Print Qty': '',
      'Rate': '',
      'Total': '',
      'Status': '',
      'Payment Status': '',
    } as any)
  }

  const csv = Papa.unparse(rows)
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName || `BinFazal_Jobs_${new Date().toISOString().split('T')[0]}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// ============================================
// IMPORT
// ============================================

export async function parseImportFile(file: File): Promise<{ headers: string[], rows: ImportRow[] }> {
  const extension = file.name.split('.').pop()?.toLowerCase()

  let rawRows: any[] = []

  if (extension === 'csv') {
    const text = await file.text()
    const result = Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
    })
    rawRows = result.data
  } else if (extension === 'xlsx' || extension === 'xls') {
    const buffer = await file.arrayBuffer()
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)
    const sheetName = workbook.worksheets.find(w => w.name.toLowerCase() === 'jobs')?.name
      || workbook.worksheets[0].name
    const worksheet = workbook.getWorksheet(sheetName)

    if (!worksheet) throw new Error('No worksheets found')

    // Get headers from first row
    const headers: string[] = []
    const firstRow = worksheet.getRow(1)
    firstRow.eachCell((cell, colNumber) => {
      headers[colNumber] = String(cell.value || '').trim()
    })

    // Get data rows
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return
      const rowData: any = {}

      row.eachCell((cell, colNumber) => {
        const header = headers[colNumber]
        if (!header) return

        // Keep raw cell value
        let val = cell.value

        // Handle Excel formula results
        if (val && typeof val === 'object' && 'result' in val) {
          val = (val as any).result
        }

        // Handle rich text
        if (val && typeof val === 'object' && 'richText' in val) {
          val = (val as any).richText.map((rt: any) => rt.text).join('')
        }

        // Handle hyperlinks
        if (val && typeof val === 'object' && 'text' in val) {
          val = (val as any).text
        }

        // Convert to trimmed string
        let strVal = ''
        if (val !== null && val !== undefined) {
          if (val instanceof Date) {
            strVal = val.toISOString().split('T')[0]
          } else {
            strVal = String(val).trim()
          }
        }

        rowData[header] = strVal
      })

      // STRICT empty check
      const values = Object.values(rowData).filter(v => v !== '' && v !== undefined)

      if (values.length >= 2) {
        // Must have at least one of the key fields
        const dateVal = rowData['Date'] || rowData['Job Date'] || ''
        const clientVal = rowData['Client Name'] || rowData['Client'] || rowData['Customer'] || ''
        const qtyVal = rowData['Print Qty'] || rowData['Print Quantity'] || rowData['Printing Qty'] || ''

        if (dateVal || clientVal || qtyVal) {
          rawRows.push(rowData)
        }
      }
    })
  } else {
    throw new Error('Unsupported file format. Please upload .xlsx, .xls, or .csv')
  }

  if (rawRows.length === 0) {
    throw new Error('No valid rows found in file')
  }

  const headers = Object.keys(rawRows[0])

  const importRows: ImportRow[] = rawRows.map((row, idx) => {
    const get = (keyOptions: string[]): string => {
      for (const k of keyOptions) {
        const found = Object.keys(row).find(rk => rk.toLowerCase().trim() === k.toLowerCase())
        if (found) {
          const val = row[found]
          return val === null || val === undefined ? '' : String(val).trim()
        }
      }
      return ''
    }

    const dateText = get(['Date', 'Job Date'])
    const dateIso = parseFlexibleDate(dateText)
    const displayDate = dateIso ? toDisplayDate(dateIso) : dateText

    return {
      rowIndex: idx + 2,
      date: displayDate,
      dateIso: dateIso,
      client_name: get(['Client Name', 'Client', 'Customer']),
      product_name: get(['Product Name', 'Product']),
      job_details: get(['Job Details', 'Details', 'Description']),
      paper_qty: get(['Paper Qty', 'Paper Quantity']),
      colors: get(['Colors', 'Colors Qty', 'Color Details']),
      print_qty: get(['Print Qty', 'Print Quantity', 'Printing Qty']),
      rate: get(['Rate', 'Printing Rate']),
      total: get(['Total', 'Total Amount', 'Amount']),
      status: get(['Status', 'Job Status']),
      payment_status: get(['Payment Status', 'Payment']),
      errors: [],
      warnings: [],
    }
  })

  // Final filter — row must have a date AND (client OR job data)
  const filteredRows = importRows.filter(r => {
    const hasDate = !!(r.date && r.date.trim())
    const hasClient = !!(r.client_name && r.client_name.trim())
    const hasJobData = !!(
      (r.job_details && r.job_details.trim()) ||
      (r.print_qty && r.print_qty.trim()) ||
      (r.rate && r.rate.trim()) ||
      (r.total && r.total.trim())
    )

    if (hasDate && (hasClient || hasJobData)) return true
    if (hasClient && hasJobData) return true
    return false
  })

  return { headers, rows: filteredRows }
}

export async function validateImportRows(
  rows: ImportRow[]
): Promise<{
  validated: ImportRow[]
  summary: { valid: number, warnings: number, errors: number, duplicates: number }
}> {
  const { data: clients } = await supabase
    .from('clients')
    .select('id, first_name, last_name, company_name')

  const { data: products } = await supabase
    .from('client_products')
    .select('id, name, client_id, job_details, paper_qty, colors_qty, print_qty, rate')

  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
  const { data: existingJobs } = await supabase
    .from('print_jobs')
    .select('job_date, client_id, job_details, total_amount')
    .gte('job_date', sixMonthsAgo.toISOString().split('T')[0])

  const clientsList = clients || []
  const productsList = products || []
  const jobsList = existingJobs || []

  const validated: ImportRow[] = rows.map(row => {
    const updated: ImportRow = {
      ...row,
      errors: [...row.errors],
      warnings: [...row.warnings],
    }

    // Validate date
    const isoDate = row.dateIso || parseFlexibleDate(updated.date)
    if (!isoDate) {
      updated.errors.push('Invalid or missing date')
      updated.dateIso = null
    } else {
      updated.dateIso = isoDate
      updated.date = toDisplayDate(isoDate)
    }

    // Match client
    if (!updated.client_name) {
      updated.errors.push('Client name is required')
    } else {
      const searchName = updated.client_name.toLowerCase().trim()
      const matches = clientsList.filter(c => {
        const company = (c.company_name || '').toLowerCase().trim()
        const fullName = `${c.first_name} ${c.last_name}`.toLowerCase().trim()
        return company === searchName || fullName === searchName
      })

      if (matches.length === 1) {
        updated.matched_client_id = matches[0].id
      } else if (matches.length > 1) {
        updated.errors.push('Multiple client matches — please select')
      } else {
        const partialMatches = clientsList.filter(c => {
          const company = (c.company_name || '').toLowerCase()
          const fullName = `${c.first_name} ${c.last_name}`.toLowerCase()
          return company.includes(searchName) || fullName.includes(searchName)
        })
        if (partialMatches.length === 1) {
          updated.matched_client_id = partialMatches[0].id
          updated.warnings.push(`Matched to "${partialMatches[0].company_name || partialMatches[0].first_name + ' ' + partialMatches[0].last_name}"`)
        } else {
          updated.errors.push('Client not found')
        }
      }
    }

    // Match product
    if (updated.product_name) {
      const searchName = updated.product_name.toLowerCase().trim()
      const matches = productsList.filter(p => p.name.toLowerCase().trim() === searchName)

      if (matches.length >= 1) {
        updated.matched_product_id = matches[0].id
      } else {
        updated.warnings.push('Product not found — ignored')
      }
    }

    // Validate numeric fields
    const printQty = parseFloat(updated.print_qty)
    const rate = parseFloat(updated.rate)

    if (!updated.print_qty || isNaN(printQty) || printQty <= 0) {
      updated.errors.push('Print Qty is required')
    }
    if (!updated.rate || isNaN(rate) || rate <= 0) {
      updated.errors.push('Rate is required')
    }

    // Auto-fill product details
    if (updated.matched_product_id) {
      const product = productsList.find(p => p.id === updated.matched_product_id)
      if (product) {
        if (!updated.job_details && product.job_details) updated.job_details = product.job_details
        if (!updated.paper_qty && product.paper_qty) updated.paper_qty = String(product.paper_qty)
        if (!updated.colors && product.colors_qty) updated.colors = String(product.colors_qty)
        if (!updated.print_qty && product.print_qty) updated.print_qty = String(product.print_qty)
        if (!updated.rate && product.rate) updated.rate = String(product.rate)
      }
    }

    // Auto-calculate total
    const totalNum = parseFloat(updated.total)
    if (!updated.total || isNaN(totalNum)) {
      const calcTotal = printQty * rate
      if (!isNaN(calcTotal) && calcTotal > 0) {
        updated.total = calcTotal.toFixed(2)
      }
    }

    // Duplicate check
    if (updated.matched_client_id && updated.dateIso) {
      const isDup = jobsList.some(j =>
        j.client_id === updated.matched_client_id &&
        j.job_date === updated.dateIso &&
        (j.job_details || '').toLowerCase().trim() === (updated.job_details || '').toLowerCase().trim() &&
        Math.abs(Number(j.total_amount) - parseFloat(updated.total || '0')) < 0.01
      )
      if (isDup) {
        updated.isDuplicate = true
        updated.warnings.push('Possible duplicate found')
      }
    }

    // Normalize status
    const validStatuses = ['new', 'in_process', 'completed']
    const normalizedStatus = (updated.status || 'new').toLowerCase().trim().replace(/\s+/g, '_')
    updated.status = validStatuses.includes(normalizedStatus) ? normalizedStatus : 'new'

    const validPayStatus = ['unpaid', 'partial', 'paid']
    const normalizedPay = (updated.payment_status || 'unpaid').toLowerCase().trim()
    updated.payment_status = validPayStatus.includes(normalizedPay) ? normalizedPay : 'unpaid'

    return updated
  })

  const summary = {
    valid: validated.filter(r => r.errors.length === 0).length,
    warnings: validated.filter(r => r.errors.length === 0 && r.warnings.length > 0).length,
    errors: validated.filter(r => r.errors.length > 0).length,
    duplicates: validated.filter(r => r.isDuplicate).length,
  }

  return { validated, summary }
}

export async function bulkInsertJobs(
  rows: ImportRow[],
  userId: string,
  skipDuplicates: boolean = true
): Promise<{
  inserted: number
  skipped: number
  failed: { rowIndex: number, error: string }[]
}> {
  const validRows = rows.filter(r => r.errors.length === 0 && !r._skip)
  const toInsert = skipDuplicates
    ? validRows.filter(r => !r.isDuplicate)
    : validRows

  if (toInsert.length === 0) {
    return { inserted: 0, skipped: validRows.length - toInsert.length, failed: [] }
  }

  const insertData = toInsert.map(r => ({
    job_date: r.dateIso,
    client_id: r.matched_client_id,
    job_details: r.job_details || null,
    paper_qty: parseFloat(r.paper_qty) || 0,
    colors_qty: parseInt(r.colors) || 1,
    print_qty: parseFloat(r.print_qty) || 0,
    rate: parseFloat(r.rate) || 0,
    total_amount: parseFloat(r.total) || 0,
    status: r.status || 'new',
    payment_status: r.payment_status || 'unpaid',
    product_id: r.matched_product_id || null,
    created_by: userId,
  }))

  const { data, error } = await supabase
    .from('print_jobs')
    .insert(insertData)
    .select()

  if (error) {
    // Try one by one to identify failures
    const failed: { rowIndex: number, error: string }[] = []
    let inserted = 0

    for (let i = 0; i < toInsert.length; i++) {
      const { error: rowError } = await supabase
        .from('print_jobs')
        .insert(insertData[i])
      if (rowError) {
        failed.push({ rowIndex: toInsert[i].rowIndex, error: rowError.message })
      } else {
        inserted++
      }
    }

    return {
      inserted,
      skipped: validRows.length - toInsert.length,
      failed,
    }
  }

  return {
    inserted: data?.length || 0,
    skipped: validRows.length - toInsert.length,
    failed: [],
  }
}
