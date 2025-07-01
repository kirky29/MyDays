'use client'

import { useFirebaseData } from '../../lib/hooks/useFirebaseData'
import { useAppStore } from '../../lib/store'
import LoadingScreen from '../components/LoadingScreen'
import AuthGuard from '../components/AuthGuard'
import AllEmployeesCalendar from '../components/AllEmployeesCalendar'

export default function AllSchedules() {
  const { loading } = useAppStore()
  
  // Initialize Firebase data loading and real-time subscriptions
  useFirebaseData()

  if (loading) {
    return <LoadingScreen />
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
        {/* Main Content Container */}
        <div className="container mx-auto px-4 py-4 sm:py-6 max-w-4xl">
          {/* Calendar */}
          <AllEmployeesCalendar />
        </div>
      </div>
    </AuthGuard>
  )
} 