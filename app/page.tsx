'use client'

import { useRouter } from 'next/navigation'
import { useFirebaseData } from '../lib/hooks/useFirebaseData'
import { useAppStore } from '../lib/store'
import LoadingScreen from './components/LoadingScreen'
import SyncStatus from './components/SyncStatus'
import AppHeader from './components/AppHeader'
import BusinessOverview from './components/BusinessOverview'
import EmployeeList from './components/EmployeeList'
import WorkDayTracker from './components/WorkDayTracker'
import AddEmployeeButton from './components/AddEmployeeButton'
import BottomNavigation from './components/BottomNavigation'
import AuthGuard from './components/AuthGuard'

export default function Home() {
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 pb-20 sm:pb-24">
        {/* Main Content Container */}
        <div className="container mx-auto px-4 py-4 sm:py-6 max-w-md">
          {/* Status and Header Section */}
          <div className="space-y-mobile">
            <SyncStatus />
            <AppHeader />
          </div>
          
          {/* Main Content Grid */}
          <div className="space-y-mobile">
            <BusinessOverview />
            <EmployeeList />
            <WorkDayTracker />
            <AddEmployeeButton />
          </div>
          
          {/* Bottom Spacing for Navigation */}
          <div className="h-4 sm:h-6"></div>
        </div>
        
        {/* Fixed Bottom Navigation */}
        <BottomNavigation onNavigate={handleNavigate} />
      </div>
    </AuthGuard>
  )
} 