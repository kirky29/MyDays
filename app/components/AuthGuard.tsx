'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { firebaseService } from '../../lib/firebase'
import { User } from 'firebase/auth'

interface AuthGuardProps {
  children: React.ReactNode
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    
    const unsubscribe = firebaseService.onAuthStateChanged((user) => {
      setUser(user)
      setLoading(false)
      
      // Only redirect if mounted to avoid hydration issues
      if (mounted && !user) {
        router.push('/login')
      }
    })

    return () => unsubscribe()
  }, [router, mounted])

  // Don't render anything until mounted (prevents hydration issues)
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 mb-2">Checking authentication...</p>
          <p className="text-sm text-gray-500">Please wait</p>
        </div>
      </div>
    )
  }

  // If no user and mounted, we'll be redirected to login
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 mb-2">Redirecting to login...</p>
          <button
            onClick={() => router.push('/login')}
            className="text-sm text-blue-600 hover:text-blue-700 underline"
          >
            Click here if not redirected automatically
          </button>
        </div>
      </div>
    )
  }

  // User is authenticated, render the protected content
  return <>{children}</>
} 