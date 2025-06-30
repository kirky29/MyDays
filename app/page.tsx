'use client'

import { useRouter } from 'next/navigation'
import { useFirebaseData } from '../lib/hooks/useFirebaseData'
import { useAppStore } from '../lib/store'
import LoadingScreen from './components/LoadingScreen'
import AppHeader from './components/AppHeader'
import BusinessOverview from './components/BusinessOverview'
import EmployeeList from './components/EmployeeList'
import AddEmployeeButton from './components/AddEmployeeButton'

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
            {employees.length === 0 && <AddEmployeeButton />}
          </div>
          

        </div>
        

      </div>
    </AuthGuard>
  )
} 