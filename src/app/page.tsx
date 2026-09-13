// src/app/page.tsx
"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/auth-context'

export default function HomePage() {
  const router = useRouter()
  const { user } = useAuth()

  useEffect(() => {
    if (user) {
      router.push('/dashboard')
    } else {
      router.push('/login')
    }
  }, [user, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF6B00]" />
    </div>
  )
}