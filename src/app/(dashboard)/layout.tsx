// src/app/(dashboard)/layout.tsx
"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/auth-context'
import { BottomNav } from '@/components/layout/bottom-nav'
import { TopBar } from '@/components/layout/top-bar'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF6B00]" />
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <TopBar />
      <BottomNav />
      <main className="pb-20 pt-16 md:pb-8 md:pl-64">
        <div className="container mx-auto px-4 py-4">
          {children}
        </div>
      </main>
    </div>
  )
}