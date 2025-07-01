'use client'

import { useRouter } from 'next/navigation'
import { useFirebaseData } from '../lib/hooks/useFirebaseData'
import { useAppStore } from '../lib/store'
import LoadingScreen from './components/LoadingScreen'
import AppHeader from './components/AppHeader'
import BusinessOverview from './components/BusinessOverview'
import EmployeeList from './components/EmployeeList'

import AuthGuard from './components/AuthGuard'

export default function Home() {
  const router = useRouter()
  const { loading, employees } = useAppStore()
  
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
        <div className="container mx-auto px-4 py-4 sm:py-6 max-w-md">
          {/* Header Section */}
          <div className="space-y-mobile">
            <AppHeader onNavigate={handleNavigate} />
          </div>
          
          {/* Main Content Grid */}
          <div className="space-y-mobile">
            <BusinessOverview />
            <EmployeeList />
          </div>
          
          {/* Additional Navigation Links */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="space-y-3">
              <button
                onClick={() => handleNavigate('/all-schedules')}
                className="w-full bg-white/80 backdrop-blur-sm border border-gray-200 rounded-2xl p-4 hover:bg-white/90 hover:shadow-md transition-all duration-200 group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-sm">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                        All Employee Schedules
                      </h3>
                      <p className="text-sm text-gray-600">
                        View all employees' shifts in one calendar
                      </p>
                    </div>
                  </div>
                  <svg className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            </div>
          </div>

        </div>
        

      </div>
    </AuthGuard>
  )
} 