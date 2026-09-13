// src/app/(dashboard)/vendors/[id]/edit/page.tsx
"use client"

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/context/auth-context'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DatePicker } from '@/components/shared/date-picker'
import { ArrowLeft, Save, X } from 'lucide-react'
import Link from 'next/link'

export default function EditVendorPage() {
  const router = useRouter()
  const params = useParams()
  const { user } = useAuth()
  const vendorId = params.id as string
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    company_name: '',
    mobile_number: '',
    address: '',
    opening_balance: '0',
    opening_balance_date: '',
  })

  useEffect(() => {
    fetchVendor()
  }, [vendorId])

  const fetchVendor = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('vendors')
      .select('*')
      .eq('id', vendorId)
      .single()

    if (data) {
      setFormData({
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        company_name: data.company_name || '',
        mobile_number: data.mobile_number || '',
        address: data.address || '',
        opening_balance: data.opening_balance?.toString() || '0',
        opening_balance_date: data.opening_balance_date || '',
      })
    }
    setLoading(false)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleDateChange = (date: string) => {
    setFormData(prev => ({ ...prev, opening_balance_date: date }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      const { error: updateError } = await supabase
        .from('vendors')
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name,
          company_name: formData.company_name || null,
          mobile_number: formData.mobile_number,
          address: formData.address || null,
          opening_balance: parseFloat(formData.opening_balance) || 0,
          opening_balance_date: formData.opening_balance_date,
        })
        .eq('id', vendorId)

      if (updateError) throw updateError

      router.push('/vendors')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
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
      <div className="flex items-center space-x-4">
        <Link href="/vendors">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Edit Vendor</h1>
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
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name *</Label>
                <Input
                  id="first_name"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name *</Label>
                <Input
                  id="last_name"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="company_name">Company Name</Label>
                <Input
                  id="company_name"
                  name="company_name"
                  value={formData.company_name}
                  onChange={handleInputChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="mobile_number">Mobile Number *</Label>
                <Input
                  id="mobile_number"
                  name="mobile_number"
                  type="tel"
                  value={formData.mobile_number}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="opening_balance">Opening Balance (PKR)</Label>
                <Input
                  id="opening_balance"
                  name="opening_balance"
                  type="number"
                  step="0.01"
                  value={formData.opening_balance}
                  onChange={handleInputChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="opening_balance_date">Opening Balance Date</Label>
                <DatePicker
                  value={formData.opening_balance_date}
                  onChange={handleDateChange}
                  placeholder="DD/MM/YYYY"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <Link href="/vendors">
                <Button variant="outline" type="button">
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? 'Saving...' : 'Update Vendor'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}