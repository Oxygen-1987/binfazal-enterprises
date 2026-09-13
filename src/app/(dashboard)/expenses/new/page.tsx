// src/app/(dashboard)/expenses/new/page.tsx
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
  Plus,
  ChevronDown
} from 'lucide-react'
import Link from 'next/link'

export default function NewExpensePage() {
  const router = useRouter()
  const { user } = useAuth()
  
  const [categories, setCategories] = useState<string[]>([])
  const [showNewCategory, setShowNewCategory] = useState(false)
  const [newCategory, setNewCategory] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const [formData, setFormData] = useState({
    expense_date: new Date().toISOString().split('T')[0],
    category: '',
    amount: '',
    description: '',
  })

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    const { data } = await supabase
      .from('expense_categories')
      .select('name')
      .order('name')

    if (data) {
      setCategories(data.map(cat => cat.name))
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleDateChange = (date: string) => {
    setFormData(prev => ({ ...prev, expense_date: date }))
  }

  const handleAddCategory = async () => {
    if (newCategory.trim()) {
      const { error } = await supabase
        .from('expense_categories')
        .insert({ name: newCategory.trim() })

      if (!error) {
        setCategories([...categories, newCategory.trim()])
        setFormData(prev => ({ ...prev, category: newCategory.trim() }))
        setNewCategory('')
        setShowNewCategory(false)
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const expenseData = {
        expense_date: formData.expense_date,
        category: formData.category,
        amount: parseFloat(formData.amount) || 0,
        description: formData.description || null,
        created_by: user?.id,
      }

      const { error: insertError } = await supabase
        .from('expenses')
        .insert(expenseData)

      if (insertError) throw insertError

      router.push('/expenses')
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
        <Link href="/expenses">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Add Expense</h1>
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
                <Label htmlFor="expense_date">Expense Date *</Label>
                <DatePicker
                  value={formData.expense_date}
                  onChange={handleDateChange}
                  placeholder="DD/MM/YYYY"
                />
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <div className="relative">
                  <select
                    id="category"
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    required
                    className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm appearance-none cursor-pointer"
                  >
                    <option value="">Select category...</option>
                    {categories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>
                <button
                  type="button"
                  onClick={() => setShowNewCategory(!showNewCategory)}
                  className="text-sm text-[#FF6B00] hover:underline flex items-center"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add new category
                </button>
                
                {showNewCategory && (
                  <div className="flex space-x-2 mt-2">
                    <Input
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      placeholder="Enter new category"
                      className="flex-1"
                    />
                    <Button type="button" size="sm" onClick={handleAddCategory}>
                      Add
                    </Button>
                  </div>
                )}
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

              {/* Description */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="description">Description</Label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                  placeholder="Enter expense description..."
                />
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex justify-between space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Link href="/expenses">
                <Button variant="outline" type="button">
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={loading}>
                <Save className="mr-2 h-4 w-4" />
                {loading ? 'Saving...' : 'Save Expense'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}