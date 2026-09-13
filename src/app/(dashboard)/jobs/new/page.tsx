// src/app/(dashboard)/jobs/new/page.tsx
"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/auth-context'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DatePicker } from '@/components/shared/date-picker'
import { 
  ArrowLeft, 
  Save, 
  PlusCircle,
  X,
} from 'lucide-react'
import Link from 'next/link'

interface Client {
  id: string
  first_name: string
  last_name: string
  company_name: string
}

export default function NewJobPage() {
  const router = useRouter()
  const { user } = useAuth()
  
  const [clients, setClients] = useState<Client[]>([])
  const [filteredClients, setFilteredClients] = useState<Client[]>([])
  const [showClientDropdown, setShowClientDropdown] = useState(false)
  const [clientSearch, setClientSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const [formData, setFormData] = useState({
    job_date: new Date().toISOString().split('T')[0],
    client_id: '',
    client_name: '',
    job_details: '',
    paper_qty: '',
    colors_qty: '1',
    print_qty: '',
    rate: '',
    total_amount: '',
    status: 'new',
    payment_status: 'unpaid',
  })

  useEffect(() => {
    fetchClients()
  }, [])

  useEffect(() => {
    if (clientSearch.trim() === '') {
      setFilteredClients(clients)
    } else {
      const filtered = clients.filter(client => 
        client.first_name.toLowerCase().includes(clientSearch.toLowerCase()) ||
        client.last_name.toLowerCase().includes(clientSearch.toLowerCase()) ||
        client.company_name?.toLowerCase().includes(clientSearch.toLowerCase())
      )
      setFilteredClients(filtered)
    }
  }, [clientSearch, clients])

  const fetchClients = async () => {
    const { data } = await supabase
      .from('clients')
      .select('id, first_name, last_name, company_name')
      .order('created_at', { ascending: false })

    if (data) {
      setClients(data)
      setFilteredClients(data)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))

    // Auto-calculation logic
    if (name === 'print_qty' || name === 'rate') {
      const printQty = name === 'print_qty' ? parseFloat(value) : parseFloat(formData.print_qty)
      const rate = name === 'rate' ? parseFloat(value) : parseFloat(formData.rate)
      
      if (printQty && rate) {
        const total = printQty * rate
        setFormData(prev => ({
          ...prev,
          total_amount: total.toFixed(2)
        }))
      }
    }

    // If total is entered manually, calculate rate
    if (name === 'total_amount') {
      const total = parseFloat(value)
      const printQty = parseFloat(formData.print_qty)
      
      if (total && printQty) {
        const calculatedRate = total / printQty
        setFormData(prev => ({
          ...prev,
          rate: calculatedRate.toFixed(4)
        }))
      }
    }
  }

  const handleDateChange = (date: string) => {
    setFormData(prev => ({ ...prev, job_date: date }))
  }

  const handleClientSelect = (client: Client) => {
    setFormData(prev => ({
      ...prev,
      client_id: client.id,
      client_name: client.company_name || `${client.first_name} ${client.last_name}`
    }))
    setShowClientDropdown(false)
    setClientSearch('')
  }

  const handleSubmit = async (e: React.FormEvent, action: 'save_new' | 'save_close') => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const jobData = {
        job_date: formData.job_date,
        client_id: formData.client_id,
        job_details: formData.job_details,
        paper_qty: parseFloat(formData.paper_qty) || 0,
        colors_qty: parseInt(formData.colors_qty) || 1,
        print_qty: parseFloat(formData.print_qty) || 0,
        rate: parseFloat(formData.rate) || 0,
        total_amount: parseFloat(formData.total_amount) || 0,
        status: formData.status,
        payment_status: formData.payment_status,
        created_by: user?.id,
      }

      const { error: insertError } = await supabase
        .from('print_jobs')
        .insert(jobData)

      if (insertError) throw insertError

      if (action === 'save_new') {
        // Reset form for new entry
        setFormData({
          job_date: new Date().toISOString().split('T')[0],
          client_id: '',
          client_name: '',
          job_details: '',
          paper_qty: '',
          colors_qty: '1',
          print_qty: '',
          rate: '',
          total_amount: '',
          status: 'new',
          payment_status: 'unpaid',
        })
      } else {
        // Save and close - go back to jobs list
        router.push('/jobs')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link href="/jobs">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">New Print Job</h1>
      </div>

      <Card>
        <CardContent className="p-6">
          <form className="space-y-6">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-md text-sm">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Date with Calendar */}
              <div className="space-y-2">
                <Label htmlFor="job_date">Date *</Label>
                <DatePicker
                  value={formData.job_date}
                  onChange={handleDateChange}
                  placeholder="DD/MM/YYYY"
                />
              </div>

              {/* Client Selection */}
              <div className="space-y-2 relative">
                <Label htmlFor="client">Client *</Label>
                <div className="relative">
                  <Input
                    id="client"
                    value={formData.client_name}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, client_name: e.target.value }))
                      setClientSearch(e.target.value)
                      setShowClientDropdown(true)
                    }}
                    onFocus={() => setShowClientDropdown(true)}
                    placeholder="Search and select client..."
                    required
                  />
                  {showClientDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {filteredClients.length === 0 ? (
                        <div className="p-3 text-sm text-gray-500 text-center">
                          No clients found. <Link href="/clients/new" className="text-[#FF6B00] hover:underline">Add new client</Link>
                        </div>
                      ) : (
                        filteredClients.map(client => (
                          <button
                            key={client.id}
                            type="button"
                            onClick={() => handleClientSelect(client)}
                            className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            <span className="font-medium">
                              {client.company_name || `${client.first_name} ${client.last_name}`}
                            </span>
                            {client.company_name && (
                              <span className="text-sm text-gray-500 ml-2">
                                ({client.first_name} {client.last_name})
                              </span>
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Job Details */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="job_details">Job Details</Label>
                <textarea
                  id="job_details"
                  name="job_details"
                  value={formData.job_details}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                  placeholder="Enter job description..."
                />
              </div>

              {/* Paper Quantity */}
              <div className="space-y-2">
                <Label htmlFor="paper_qty">Paper Quantity</Label>
                <Input
                  id="paper_qty"
                  name="paper_qty"
                  type="number"
                  step="0.01"
                  value={formData.paper_qty}
                  onChange={handleInputChange}
                  placeholder="0"
                />
              </div>

              {/* Colors Quantity */}
              <div className="space-y-2">
                <Label htmlFor="colors_qty">Colors Quantity</Label>
                <Input
                  id="colors_qty"
                  name="colors_qty"
                  type="number"
                  min="1"
                  value={formData.colors_qty}
                  onChange={handleInputChange}
                  placeholder="1"
                />
              </div>

              {/* Print Quantity */}
              <div className="space-y-2">
                <Label htmlFor="print_qty">Print Quantity *</Label>
                <Input
                  id="print_qty"
                  name="print_qty"
                  type="number"
                  step="0.01"
                  value={formData.print_qty}
                  onChange={handleInputChange}
                  placeholder="0"
                  required
                />
              </div>

              {/* Rate */}
              <div className="space-y-2">
                <Label htmlFor="rate">Rate *</Label>
                <Input
                  id="rate"
                  name="rate"
                  type="number"
                  step="0.0001"
                  value={formData.rate}
                  onChange={handleInputChange}
                  placeholder="0"
                  required
                />
              </div>

              {/* Total Amount */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="total_amount">Total Amount (PKR) *</Label>
                <Input
                  id="total_amount"
                  name="total_amount"
                  type="number"
                  step="0.01"
                  value={formData.total_amount}
                  onChange={handleInputChange}
                  placeholder="0"
                  className="text-lg font-bold"
                  required
                />
                <p className="text-xs text-gray-500">
                  Auto-calculates from Qty × Rate, or enter manually to calculate rate
                </p>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label htmlFor="status">Job Status</Label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                >
                  <option value="new">New</option>
                  <option value="in_process">In Process</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              {/* Payment Status */}
              <div className="space-y-2">
                <Label htmlFor="payment_status">Payment Status</Label>
                <select
                  id="payment_status"
                  name="payment_status"
                  value={formData.payment_status}
                  onChange={handleInputChange}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                >
                  <option value="unpaid">Unpaid</option>
                  <option value="partial">Partial</option>
                  <option value="paid">Paid</option>
                </select>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex justify-between space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Link href="/jobs">
                <Button variant="outline" type="button">
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
              </Link>
              <div className="flex space-x-3">
                <Button 
                  type="button" 
                  variant="outline"
                  disabled={loading}
                  onClick={(e) => handleSubmit(e, 'save_new')}
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  {loading ? 'Saving...' : 'Save and New'}
                </Button>
                <Button 
                  type="button"
                  disabled={loading}
                  onClick={(e) => handleSubmit(e, 'save_close')}
                >
                  <Save className="mr-2 h-4 w-4" />
                  {loading ? 'Saving...' : 'Save and Close'}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}