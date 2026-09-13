// src/app/(dashboard)/payments/new/page.tsx
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
  X,
  ChevronDown
} from 'lucide-react'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils/format'

interface Client {
  id: string
  first_name: string
  last_name: string
  company_name: string
  account_balance?: number
}

export default function NewPaymentPage() {
  const router = useRouter()
  const { user } = useAuth()
  
  const [clients, setClients] = useState<Client[]>([])
  const [filteredClients, setFilteredClients] = useState<Client[]>([])
  const [showClientDropdown, setShowClientDropdown] = useState(false)
  const [clientSearch, setClientSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const [formData, setFormData] = useState({
  payment_date: new Date().toISOString().split('T')[0],
  client_id: '',
  client_name: '',
  amount: '',
  payment_method: '',
  notes: '',
  // Conditional fields
  cheque_number: '',
  cheque_date: '',
  bank_name: '',
  account_number: '',
  account_title: '',
  mobile_number: '',
  transaction_id: '',
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
    const { data: clientsData } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false })

    if (clientsData) {
      const { data: jobsData } = await supabase
        .from('print_jobs')
        .select('client_id, total_amount')

      const { data: paymentsData } = await supabase
        .from('payments')
        .select('client_id, amount')

      const clientsWithBalance = clientsData.map(client => {
        const totalJobs = jobsData
          ?.filter(job => job.client_id === client.id)
          .reduce((sum, job) => sum + Number(job.total_amount), 0) || 0

        const totalPayments = paymentsData
          ?.filter(payment => payment.client_id === client.id)
          .reduce((sum, payment) => sum + Number(payment.amount), 0) || 0

        const accountBalance = Number(client.opening_balance) + totalJobs - totalPayments

        return {
          ...client,
          account_balance: accountBalance
        }
      })

      setClients(clientsWithBalance)
      setFilteredClients(clientsWithBalance)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleDateChange = (date: string) => {
    setFormData(prev => ({ ...prev, payment_date: date }))
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

  const handlePaymentMethodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
  const method = e.target.value
  setFormData(prev => ({ 
    ...prev, 
    payment_method: method,
    // Reset conditional fields when method changes
    cheque_number: '',
    cheque_date: '',
    bank_name: '',
    account_number: '',
    account_title: '',
    mobile_number: '',
    transaction_id: '',
  }))
}

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  setLoading(true)
  setError('')

  try {
    // Build notes with payment details
    let paymentDetails = ''
    if (formData.payment_method === 'cheque') {
      paymentDetails = `Cheque No: ${formData.cheque_number}, Bank: ${formData.bank_name}, Title: ${formData.account_title}, Cheque Date: ${formData.cheque_date}`
    } else if (formData.payment_method === 'bank_transfer') {
      paymentDetails = `Bank: ${formData.bank_name}, Title: ${formData.account_title}, Ref/Transaction: ${formData.transaction_id}`
    } else if (formData.payment_method === 'jazzcash' || formData.payment_method === 'easypaisa') {
      paymentDetails = `Title: ${formData.account_title}, Transaction ID: ${formData.transaction_id}`
    }

    const fullNotes = [formData.notes, paymentDetails].filter(Boolean).join(' | ')

    const paymentData = {
      payment_date: formData.payment_date,
      client_id: formData.client_id,
      amount: parseFloat(formData.amount) || 0,
      payment_method: formData.payment_method,
      notes: fullNotes || null,
      created_by: user?.id,
    }

    const { error: insertError } = await supabase
      .from('payments')
      .insert(paymentData)

    if (insertError) throw insertError

    router.push('/payments')
  } catch (err: any) {
    setError(err.message)
  } finally {
    setLoading(false)
  }
}

  const selectedClient = clients.find(c => c.id === formData.client_id)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link href="/payments">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Record Payment</h1>
      </div>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-md text-sm">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Date */}
              <div className="space-y-2">
                <Label htmlFor="payment_date">Payment Date *</Label>
                <DatePicker
                  value={formData.payment_date}
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
                          No clients found
                        </div>
                      ) : (
                        filteredClients.map(client => (
                          <button
                            key={client.id}
                            type="button"
                            onClick={() => handleClientSelect(client)}
                            className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            <div className="flex justify-between items-center">
                              <span className="font-medium">
                                {client.company_name || `${client.first_name} ${client.last_name}`}
                              </span>
                              {client.account_balance !== undefined && (
                                <span className={`text-sm ${
                                  client.account_balance > 0 ? 'text-red-600' : 'text-green-600'
                                }`}>
                                  {formatCurrency(client.account_balance)}
                                </span>
                              )}
                            </div>
                            {client.company_name && (
                              <span className="text-sm text-gray-500">
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

              {/* Amount */}
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (PKR) *</Label>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={handleInputChange}
                  placeholder="0"
                  required
                  className="text-lg font-bold"
                />
              </div>

              {/* Payment Method Dropdown */}
              <div className="space-y-2">
                <Label htmlFor="payment_method">Payment Method *</Label>
                <div className="relative">
                  <select
                    id="payment_method"
                    name="payment_method"
                    value={formData.payment_method}
                    onChange={handlePaymentMethodChange}
                    required
                    className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm appearance-none cursor-pointer"
                  >
                    <option value="">Select payment method...</option>
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cheque">Cheque</option>
                    <option value="jazzcash">JazzCash</option>
                    <option value="easypaisa">EasyPaisa</option>
                    <option value="other">Other</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Conditional Fields for Cheque */}
              {formData.payment_method === 'cheque' && (
  <>
    <div className="space-y-2">
      <Label htmlFor="bank_name">Bank Name *</Label>
      <Input
        id="bank_name"
        name="bank_name"
        value={formData.bank_name}
        onChange={handleInputChange}
        placeholder="Enter bank name"
        required
      />
    </div>
    <div className="space-y-2">
      <Label htmlFor="account_title">Account Title *</Label>
      <Input
        id="account_title"
        name="account_title"
        value={formData.account_title}
        onChange={handleInputChange}
        placeholder="Enter account title"
        required
      />
    </div>
    <div className="space-y-2">
      <Label htmlFor="cheque_number">Cheque Number *</Label>
      <Input
        id="cheque_number"
        name="cheque_number"
        value={formData.cheque_number}
        onChange={handleInputChange}
        placeholder="Enter cheque number"
        required
      />
    </div>
    <div className="space-y-2">
      <Label htmlFor="cheque_date">Cheque Date *</Label>
      <DatePicker
        value={formData.cheque_date}
        onChange={(date) => setFormData(prev => ({ ...prev, cheque_date: date }))}
        placeholder="DD/MM/YYYY"
      />
    </div>
  </>
)}

              {/* Conditional Fields for Bank Transfer */}
              {formData.payment_method === 'bank_transfer' && (
  <>
    <div className="space-y-2">
      <Label htmlFor="bank_name">Bank Name *</Label>
      <Input
        id="bank_name"
        name="bank_name"
        value={formData.bank_name}
        onChange={handleInputChange}
        placeholder="Enter bank name"
        required
      />
    </div>
    <div className="space-y-2">
      <Label htmlFor="account_title">Account Title *</Label>
      <Input
        id="account_title"
        name="account_title"
        value={formData.account_title}
        onChange={handleInputChange}
        placeholder="Enter account title"
        required
      />
    </div>
    <div className="space-y-2">
      <Label htmlFor="transaction_id">Transaction / Ref # *</Label>
      <Input
        id="transaction_id"
        name="transaction_id"
        value={formData.transaction_id}
        onChange={handleInputChange}
        placeholder="Enter transaction or reference number"
        required
      />
    </div>
  </>
)}


              {/* Conditional Fields for JazzCash/EasyPaisa */}
              {(formData.payment_method === 'jazzcash' || formData.payment_method === 'easypaisa') && (
  <>
    <div className="space-y-2">
      <Label htmlFor="account_title">Account Title *</Label>
      <Input
        id="account_title"
        name="account_title"
        value={formData.account_title}
        onChange={handleInputChange}
        placeholder="Enter account title"
        required
      />
    </div>
    <div className="space-y-2">
      <Label htmlFor="transaction_id">Transaction ID *</Label>
      <Input
        id="transaction_id"
        name="transaction_id"
        value={formData.transaction_id}
        onChange={handleInputChange}
        placeholder="Enter transaction ID"
        required
      />
    </div>
  </>
)}

              {/* Notes */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                  placeholder="Enter payment notes (optional)..."
                />
              </div>

              {/* Client Balance Display */}
              {selectedClient && selectedClient.account_balance !== undefined && (
                <div className="md:col-span-2 bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Current Balance:</span>
                    <span className={`font-bold ${
                      selectedClient.account_balance > 0 ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {formatCurrency(selectedClient.account_balance)}
                    </span>
                  </div>
                  {formData.amount && (
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-sm text-gray-500">Balance After Payment:</span>
                      <span className={`font-bold ${
                        selectedClient.account_balance - parseFloat(formData.amount) > 0 
                          ? 'text-red-600' 
                          : 'text-green-600'
                      }`}>
                        {formatCurrency(selectedClient.account_balance - parseFloat(formData.amount))}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="flex justify-between space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Link href="/payments">
                <Button variant="outline" type="button">
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={loading}>
                <Save className="mr-2 h-4 w-4" />
                {loading ? 'Saving...' : 'Save Payment'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}