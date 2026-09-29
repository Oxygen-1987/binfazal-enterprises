// src/app/(dashboard)/jobs/import/page.tsx
"use client"

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/auth-context'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { showToast } from '@/lib/utils/toast'
import { getErrorMessage } from '@/lib/utils/errors'
import { formatCurrency } from '@/lib/utils/format'
import {
  parseImportFile,
  validateImportRows,
  bulkInsertJobs,
  parseFlexibleDate,
  type ImportRow,
} from '@/lib/utils/job-import-export'
import {
  ArrowLeft,
  Upload,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  XCircle,
  Loader2,
  Trash2,
  AlertTriangle,
} from 'lucide-react'
import Link from 'next/link'

export default function ImportJobsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [parsing, setParsing] = useState(false)
  const [posting, setPosting] = useState(false)
  const [rows, setRows] = useState<ImportRow[]>([])
  const [fileName, setFileName] = useState('')
  const [summary, setSummary] = useState({ valid: 0, warnings: 0, errors: 0, duplicates: 0 })
  const [clients, setClients] = useState<any[]>([])
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false)

  const loadClients = async () => {
    const { data } = await supabase
      .from('clients')
      .select('id, first_name, last_name, company_name')
      .order('company_name', { ascending: true })
    setClients(data || [])
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    await processFile(file)
  }

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (!file) return
    await processFile(file)
  }

  const processFile = async (file: File) => {
    setParsing(true)
    setFileName(file.name)
    try {
      if (clients.length === 0) await loadClients()

      const { rows: parsedRows } = await parseImportFile(file)
      const { validated, summary: sum } = await validateImportRows(parsedRows)

      setRows(validated)
      setSummary(sum)

      if (validated.length === 0) {
        showToast.warning('No rows found in file')
      } else {
        showToast.success(`Parsed ${validated.length} rows`)
      }
    } catch (err: any) {
      console.error('Parse error:', err)
      showToast.error('Failed to parse file', getErrorMessage(err))
      setRows([])
    } finally {
      setParsing(false)
    }
  }

  const updateRow = (index: number, field: keyof ImportRow, value: any) => {
    setRows(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }

      // Handle date
      if (field === 'date') {
        const iso = parseFlexibleDate(value)
        if (iso) {
          const parts = iso.split('-')
          updated[index].dateIso = iso
          updated[index].date = `${parts[2]}/${parts[1]}/${parts[0]}`
          updated[index].errors = updated[index].errors.filter(e => e !== 'Invalid or missing date')
        } else {
          updated[index].dateIso = null
          if (!updated[index].errors.includes('Invalid or missing date')) {
            updated[index].errors = [...updated[index].errors, 'Invalid or missing date']
          }
        }
      }

      // Handle client match
      if (field === 'matched_client_id') {
        const client = clients.find(c => c.id === value)
        if (client) {
          updated[index].client_name = client.company_name || `${client.first_name} ${client.last_name}`
          updated[index].errors = updated[index].errors.filter(e =>
            e !== 'Client not found' && e !== 'Multiple client matches — please select'
          )
        }
      }

      // Handle qty/rate → recalc total
      if (field === 'print_qty' || field === 'rate') {
        const qty = parseFloat(updated[index].print_qty) || 0
        const rate = parseFloat(updated[index].rate) || 0
        if (qty > 0 && rate > 0) {
          updated[index].total = (qty * rate).toFixed(2)
        }
      }

      return updated
    })
  }

  const removeRow = (index: number) => {
    setRows(prev => prev.filter((_, i) => i !== index))
  }

  const handlePost = async () => {
    const hasDuplicates = rows.some(r => r.isDuplicate && !r._skip)
    if (hasDuplicates) {
      setShowDuplicateDialog(true)
      return
    }
    await doPost(true)
  }

  const doPost = async (skipDuplicates: boolean) => {
    setShowDuplicateDialog(false)
    setPosting(true)

    try {
      if (!user?.id) throw new Error('User not authenticated')

      const result = await bulkInsertJobs(rows, user.id, skipDuplicates)

      if (result.failed.length > 0) {
        showToast.warning(
          `Posted ${result.inserted} jobs, ${result.failed.length} failed`
        )
        setRows(prev => prev.map(r => {
          const failure = result.failed.find(f => f.rowIndex === r.rowIndex)
          if (failure) {
            return { ...r, errors: [...r.errors, `Post failed: ${failure.error}`] }
          }
          return r
        }))
      } else {
        showToast.success(`Successfully posted ${result.inserted} jobs`)
        router.push('/jobs')
      }
    } catch (err: any) {
      console.error('Post error:', err)
      showToast.error('Failed to post jobs', getErrorMessage(err))
    } finally {
      setPosting(false)
    }
  }

  const clearAll = () => {
    setRows([])
    setFileName('')
    setSummary({ valid: 0, warnings: 0, errors: 0, duplicates: 0 })
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const validRows = rows.filter(r => r.errors.length === 0 && !r._skip)
  const totalAmount = validRows.reduce((sum, r) => sum + (parseFloat(r.total) || 0), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Link href="/jobs">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Import Jobs</h1>
          <p className="text-sm text-gray-500">
            Bulk import print jobs from Excel or CSV
          </p>
        </div>
      </div>

      {rows.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Upload className="h-5 w-5 mr-2 text-[#FF6B00]" />
              Upload File
            </CardTitle>
            <CardDescription>
              Upload an Excel (.xlsx) or CSV file with your print jobs. Click <strong>Export</strong> on the Jobs page to get a template.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-12 text-center hover:border-[#FF6B00] transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              {parsing ? (
                <>
                  <Loader2 className="h-12 w-12 mx-auto mb-4 text-[#FF6B00] animate-spin" />
                  <p className="text-gray-500">Parsing file...</p>
                </>
              ) : (
                <>
                  <FileSpreadsheet className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                  <p className="font-medium mb-2">
                    Drop file here or click to browse
                  </p>
                  <p className="text-sm text-gray-500">
                    Supports .xlsx, .xls, and .csv
                  </p>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleFileSelect}
            />
          </CardContent>
        </Card>
      )}

      {rows.length > 0 && (
        <>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="h-5 w-5 text-[#FF6B00]" />
                    <span className="font-medium">{fileName}</span>
                  </div>
                  <div className="flex gap-3 text-sm">
                    <span className="flex items-center gap-1 text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      {summary.valid} valid
                    </span>
                    {summary.warnings > 0 && (
                      <span className="flex items-center gap-1 text-yellow-600">
                        <AlertCircle className="h-4 w-4" />
                        {summary.warnings} warnings
                      </span>
                    )}
                    {summary.duplicates > 0 && (
                      <span className="flex items-center gap-1 text-orange-600">
                        <AlertTriangle className="h-4 w-4" />
                        {summary.duplicates} duplicates
                      </span>
                    )}
                    {summary.errors > 0 && (
                      <span className="flex items-center gap-1 text-red-600">
                        <XCircle className="h-4 w-4" />
                        {summary.errors} errors
                      </span>
                    )}
                  </div>
                </div>

                <Button variant="outline" size="sm" onClick={clearAll}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Clear
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Preview & Edit</CardTitle>
              <CardDescription>
                Edit any field inline. Invalid rows must be fixed before posting.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-900 border-b-2 border-gray-300 dark:border-gray-700">
                      <th className="text-left p-2 font-semibold w-8">#</th>
                      <th className="text-left p-2 font-semibold w-32">Date</th>
                      <th className="text-left p-2 font-semibold w-40">Client</th>
                      <th className="text-left p-2 font-semibold w-40">Details</th>
                      <th className="text-right p-2 font-semibold w-20">Paper</th>
                      <th className="text-right p-2 font-semibold w-16">Colors</th>
                      <th className="text-right p-2 font-semibold w-24">Print Qty</th>
                      <th className="text-right p-2 font-semibold w-20">Rate</th>
                      <th className="text-right p-2 font-semibold w-24">Total</th>
                      <th className="text-center p-2 font-semibold w-24">Status</th>
                      <th className="text-center p-2 font-semibold w-24">Payment</th>
                      <th className="w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, index) => {
                      const hasError = row.errors.length > 0
                      const hasWarning = row.warnings.length > 0 && !hasError

                      return (
                        <tr
                          key={index}
                          className={`border-b ${
                            hasError
                              ? 'bg-red-50 dark:bg-red-900/10'
                              : row.isDuplicate
                              ? 'bg-orange-50 dark:bg-orange-900/10'
                              : hasWarning
                              ? 'bg-yellow-50 dark:bg-yellow-900/10'
                              : 'hover:bg-gray-50 dark:hover:bg-gray-900/50'
                          }`}
                        >
                          <td className="p-2 text-gray-500">{row.rowIndex}</td>

                          <td className="p-2">
                            <Input
                              value={row.date}
                              onChange={(e) => updateRow(index, 'date', e.target.value)}
                              className="h-8 text-xs"
                              placeholder="DD/MM/YYYY"
                            />
                          </td>

                          <td className="p-2">
                            <select
                              value={row.matched_client_id || ''}
                              onChange={(e) => updateRow(index, 'matched_client_id', e.target.value)}
                              className={`w-full h-8 text-xs rounded border px-2 ${
                                hasError && !row.matched_client_id
                                  ? 'border-red-500 bg-red-50'
                                  : 'border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900'
                              }`}
                            >
                              <option value="">Select...</option>
                              {clients.map(c => (
                                <option key={c.id} value={c.id}>
                                  {c.company_name || `${c.first_name} ${c.last_name}`}
                                </option>
                              ))}
                            </select>
                          </td>

                          <td className="p-2">
                            <Input
                              value={row.job_details}
                              onChange={(e) => updateRow(index, 'job_details', e.target.value)}
                              className="h-8 text-xs"
                            />
                          </td>

                          <td className="p-2">
                            <Input
                              value={row.paper_qty}
                              onChange={(e) => updateRow(index, 'paper_qty', e.target.value)}
                              className="h-8 text-xs text-right"
                            />
                          </td>

                          <td className="p-2">
                            <Input
                              value={row.colors}
                              onChange={(e) => updateRow(index, 'colors', e.target.value)}
                              className="h-8 text-xs text-right"
                            />
                          </td>

                          <td className="p-2">
                            <Input
                              value={row.print_qty}
                              onChange={(e) => updateRow(index, 'print_qty', e.target.value)}
                              className="h-8 text-xs text-right"
                            />
                          </td>

                          <td className="p-2">
                            <Input
                              value={row.rate}
                              onChange={(e) => updateRow(index, 'rate', e.target.value)}
                              className="h-8 text-xs text-right"
                            />
                          </td>

                          <td className="p-2">
                            <Input
                              value={row.total}
                              onChange={(e) => updateRow(index, 'total', e.target.value)}
                              className="h-8 text-xs text-right font-medium"
                            />
                          </td>

                          <td className="p-2">
                            <select
                              value={row.status}
                              onChange={(e) => updateRow(index, 'status', e.target.value)}
                              className="w-full h-8 text-xs rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-1"
                            >
                              <option value="new">New</option>
                              <option value="in_process">In Process</option>
                              <option value="completed">Completed</option>
                            </select>
                          </td>

                          <td className="p-2">
                            <select
                              value={row.payment_status}
                              onChange={(e) => updateRow(index, 'payment_status', e.target.value)}
                              className="w-full h-8 text-xs rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-1"
                            >
                              <option value="unpaid">Unpaid</option>
                              <option value="partial">Partial</option>
                              <option value="paid">Paid</option>
                            </select>
                          </td>

                          <td className="p-2">
                            <button
                              onClick={() => removeRow(index)}
                              className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/20 text-red-500"
                              title="Remove row"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>

                {rows.some(r => r.errors.length > 0 || r.warnings.length > 0) && (
                  <div className="mt-4 space-y-2">
                    {rows.map((row, index) => (
                      (row.errors.length > 0 || row.warnings.length > 0) && (
                        <div
                          key={index}
                          className={`p-2 rounded text-xs ${
                            row.errors.length > 0
                              ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                              : 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300'
                          }`}
                        >
                          <strong>Row {row.rowIndex}:</strong>
                          {row.errors.length > 0 && (
                            <span className="ml-2">❌ {row.errors.join(', ')}</span>
                          )}
                          {row.warnings.length > 0 && (
                            <span className="ml-2">⚠️ {row.warnings.join(', ')}</span>
                          )}
                        </div>
                      )
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-50 dark:bg-gray-900">
            <CardContent className="p-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <p className="text-sm text-gray-500">
                    {validRows.length} of {rows.length} rows ready to post
                  </p>
                  <p className="text-2xl font-bold text-[#FF6B00]">
                    Total: {formatCurrency(totalAmount)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={clearAll} disabled={posting}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handlePost}
                    disabled={posting || validRows.length === 0}
                  >
                    {posting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle className="mr-2 h-4 w-4" />
                    )}
                    {posting ? 'Posting...' : `Post ${validRows.length} Jobs`}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {showDuplicateDialog && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl p-6 max-w-md w-full">
            <div className="flex items-start space-x-3 mb-4">
              <div className="bg-orange-100 dark:bg-orange-900/30 p-2 rounded-full">
                <AlertTriangle className="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Duplicates Detected</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {summary.duplicates} row{summary.duplicates > 1 ? 's' : ''} appear to be duplicates of existing jobs.
                </p>
              </div>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              How would you like to handle these duplicates?
            </p>

            <div className="space-y-2">
              <Button
                onClick={() => doPost(true)}
                className="w-full justify-start"
                variant="outline"
              >
                <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                Skip duplicates and post {validRows.length - summary.duplicates}
              </Button>
              <Button
                onClick={() => doPost(false)}
                className="w-full justify-start"
                variant="outline"
              >
                <AlertCircle className="mr-2 h-4 w-4 text-orange-500" />
                Post all {validRows.length} (may create duplicates)
              </Button>
              <Button
                onClick={() => setShowDuplicateDialog(false)}
                className="w-full"
                variant="ghost"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}