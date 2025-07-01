'use client'

import { useRouter } from 'next/navigation'
import { useFirebaseData } from '../../lib/hooks/useFirebaseData'
import { useAppStore } from '../../lib/store'
import LoadingScreen from '../components/LoadingScreen'
import AppHeader from '../components/AppHeader'
import AuthGuard from '../components/AuthGuard'
import AllEmployeesCalendar from '../components/AllEmployeesCalendar'

export default function AllSchedules() {
  const router = useRouter()
  const { loading } = useAppStore()
  
  // Initialize Firebase data loading and real-time subscriptions
  useFirebaseData()

  const handleNavigate = (path: string) => {
    router.push(path)
  }

  if (loading) {
    return <LoadingScreen />
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
        {/* Main Content Container */}
        <div className="container mx-auto px-4 py-4 sm:py-6 max-w-4xl">
          {/* Header Section */}
          <div className="space-y-mobile">
            <AppHeader onNavigate={handleNavigate} />
          </div>
          
          {/* Page Title */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <svg className="w-6 h-6 mr-3 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              All Employee Schedules
            </h1>
            <p className="text-gray-600 mt-2">
              View all employees' work schedules and shift history in one calendar
            </p>
          </div>
          
          {/* Calendar */}
          <AllEmployeesCalendar />
        </div>
      </div>
    </AuthGuard>
  )
} 