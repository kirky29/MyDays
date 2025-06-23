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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 pb-20">
      <div className="container mx-auto px-4 py-6 max-w-md">
        <SyncStatus />
        <AppHeader />
        <BusinessOverview />
        <EmployeeList />
        <WorkDayTracker />
        <AddEmployeeButton />
      </div>
      <BottomNavigation onNavigate={handleNavigate} />
    </div>
  )
} 