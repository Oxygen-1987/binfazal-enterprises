// src/app/(dashboard)/vendors/[id]/ledger/page.tsx
"use client"

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useAuth } from '@/context/auth-context'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Printer, ShoppingCart, Wallet } from 'lucide-react'
import Link from 'next/link'
import { formatCurrency, formatDate } from '@/lib/utils/format'

interface LedgerEntry {
  id: string
  date: string
  type: 'purchase' | 'payment' | 'opening'
  description: string
  debit: number
  credit: number
  balance: number
}

export default function VendorLedgerPage() {
  const params = useParams()
  const vendorId = params.id as string
  const { userRole } = useAuth()
  
  const [vendor, setVendor] = useState<any>(null)
  const [entries, setEntries] = useState<LedgerEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [runningBalance, setRunningBalance] = useState(0)

  useEffect(() => {
    fetchLedger()
  }, [vendorId])

  const fetchLedger = async () => {
    setLoading(true)

    // Fetch vendor details
    const { data: vendorData } = await supabase
      .from('vendors')
      .select('*')
      .eq('id', vendorId)
      .single()

    setVendor(vendorData)

    // Fetch all purchases for this vendor
    const { data: purchasesData } = await supabase
      .from('purchases')
      .select('*')
      .eq('vendor_id', vendorId)
      .order('purchase_date', { ascending: true })

    // Fetch all payments for this vendor
    const { data: paymentsData } = await supabase
      .from('vendor_payments')
      .select('*')
      .eq('vendor_id', vendorId)
      .order('payment_date', { ascending: true })

    // Build ledger entries
    const ledgerEntries: LedgerEntry[] = []
    let balance = Number(vendorData?.opening_balance) || 0

    // Add opening balance entry
    if (balance > 0) {
      ledgerEntries.push({
        id: 'opening',
        date: vendorData?.opening_balance_date || vendorData?.created_at,
        type: 'opening',
        description: 'Opening Balance',
        debit: balance,
        credit: 0,
        balance: balance,
      })
    }

    // Add purchases (debits - you owe vendor)
    purchasesData?.forEach(purchase => {
      balance += Number(purchase.total_amount)
      ledgerEntries.push({
        id: purchase.id,
        date: purchase.purchase_date,
        type: 'purchase',
        description: `Purchase - ${purchase.item_details || 'No details'}`,
        debit: Number(purchase.total_amount),
        credit: 0,
        balance: balance,
      })
    })

    // Add payments (credits - you paid vendor)
    paymentsData?.forEach(payment => {
      balance -= Number(payment.amount)
      ledgerEntries.push({
        id: payment.id,
        date: payment.payment_date,
        type: 'payment',
        description: `Payment - ${payment.notes || ''}`,
        debit: 0,
        credit: Number(payment.amount),
        balance: balance,
      })
    })

    // Sort by date
    ledgerEntries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    setEntries(ledgerEntries)
    setRunningBalance(balance)
    setLoading(false)
  }

  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF6B00]" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/vendors">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">
              {vendor?.company_name || `${vendor?.first_name} ${vendor?.last_name}`}
            </h1>
            <p className="text-sm text-gray-500">Vendor Ledger</p>
          </div>
        </div>
        <Button variant="outline" onClick={handlePrint}>
          <Printer className="mr-2 h-4 w-4" />
          Print
        </Button>
      </div>

      {/* Balance Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Opening Balance</p>
            <p className="text-xl font-bold">{formatCurrency(vendor?.opening_balance || 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Total Purchases</p>
            <p className="text-xl font-bold text-red-600">
              {formatCurrency(entries.filter(e => e.type === 'purchase').reduce((sum, e) => sum + e.debit, 0))}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Total Payments</p>
            <p className="text-xl font-bold text-green-600">
              {formatCurrency(entries.filter(e => e.type === 'payment').reduce((sum, e) => sum + e.credit, 0))}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Current Balance */}
      <Card className="bg-gray-50 dark:bg-gray-900">
        <CardContent className="p-4 flex justify-between items-center">
          <span className="font-semibold">Current Payable</span>
          <span className={`text-2xl font-bold ${
            runningBalance > 0 ? 'text-red-600' : 'text-green-600'
          }`}>
            {formatCurrency(runningBalance)}
          </span>
        </CardContent>
      </Card>

      {/* Ledger Table */}
      <Card>
        <CardContent className="p-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b dark:border-gray-700">
                <th className="text-left py-2 px-3">Date</th>
                <th className="text-left py-2 px-3">Description</th>
                <th className="text-right py-2 px-3">Debit</th>
                <th className="text-right py-2 px-3">Credit</th>
                <th className="text-right py-2 px-3">Balance</th>
              </tr>
            </thead>
            <tbody>
              {entries.map(entry => (
                <tr key={entry.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="py-2 px-3 whitespace-nowrap">{formatDate(entry.date)}</td>
                  <td className="py-2 px-3">
                    <div className="flex items-center">
                      {entry.type === 'purchase' && (
                        <ShoppingCart className="h-4 w-4 text-red-500 mr-2" />
                      )}
                      {entry.type === 'payment' && (
                        <Wallet className="h-4 w-4 text-green-500 mr-2" />
                      )}
                      {entry.type === 'opening' && (
                        <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                      )}
                      {entry.description}
                    </div>
                  </td>
                  <td className="text-right py-2 px-3 text-red-600">
                    {entry.debit > 0 ? formatCurrency(entry.debit) : '-'}
                  </td>
                  <td className="text-right py-2 px-3 text-green-600">
                    {entry.credit > 0 ? formatCurrency(entry.credit) : '-'}
                  </td>
                  <td className="text-right py-2 px-3 font-medium">
                    {formatCurrency(entry.balance)}
                  </td>
                </tr>
              ))}
              {entries.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-gray-500">
                    No transactions found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}