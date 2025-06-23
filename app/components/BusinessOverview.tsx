import { useRouter } from 'next/navigation'
import { useAppStore } from '../../lib/store'

export default function BusinessOverview() {
  const router = useRouter()
  const { employees, workDays, calculateEmployeeStats } = useAppStore()

  if (employees.length === 0) return null

  const totalOutstanding = employees.reduce((total, emp) => {
    const stats = calculateEmployeeStats(emp.id)
    return total + stats.totalOwed
  }, 0)

  const totalEarned = employees.reduce((total, emp) => {
    const stats = calculateEmployeeStats(emp.id)
    return total + stats.totalEarned
  }, 0)

  const totalPaid = employees.reduce((total, emp) => {
    const stats = calculateEmployeeStats(emp.id)
    return total + (stats.totalPaid * emp.dailyWage)
  }, 0)

  const workDaysCount = workDays.filter(day => day.worked).length
  const paidDaysCount = workDays.filter(day => day.paid).length

  const handleNavigateToTeam = () => {
    router.push('/team')
  }

  const handleNavigateToCalendar = () => {
    router.push('/calendar')
  }

  return (
    <div className="mb-6">
      {/* Enhanced Header */}
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Business Overview</h2>
          <p className="text-sm text-gray-600 mt-1">Your workspace at a glance</p>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-6">
        {/* Work Days Card - Clickable */}
        <button
          onClick={handleNavigateToCalendar}
          className="card group cursor-pointer text-left hover:shadow-lg transition-all duration-200"
        >
          <div className="card-body">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <svg className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-blue-600 mb-1">
              {workDaysCount}
            </div>
            <div className="text-sm font-semibold text-gray-900 mb-1">Work Days</div>
            <div className="text-xs text-gray-600">Total days worked</div>
          </div>
        </button>

        {/* Paid Days Card - Clickable */}
        <button
          onClick={handleNavigateToCalendar}
          className="card group cursor-pointer text-left hover:shadow-lg transition-all duration-200"
        >
          <div className="card-body">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center group-hover:bg-green-200 transition-colors">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <svg className="w-5 h-5 text-gray-400 group-hover:text-green-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-green-600 mb-1">
              {paidDaysCount}
            </div>
            <div className="text-sm font-semibold text-gray-900 mb-1">Paid Days</div>
            <div className="text-xs text-gray-600">Days with payment</div>
          </div>
        </button>

        {/* Team Size Card - Clickable */}
        <button
          onClick={handleNavigateToTeam}
          className="card group cursor-pointer text-left hover:shadow-lg transition-all duration-200"
        >
          <div className="card-body">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <svg className="w-5 h-5 text-gray-400 group-hover:text-purple-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-purple-600 mb-1">
              {employees.length}
            </div>
            <div className="text-sm font-semibold text-gray-900 mb-1">Team Size</div>
            <div className="text-xs text-gray-600">Active employees</div>
          </div>
        </button>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6">
        <div className="card">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Total Earned</p>
                <p className="text-2xl sm:text-3xl font-bold text-blue-600">
                  £{totalEarned.toFixed(2)}
                </p>
                <p className="text-xs text-gray-500 mt-1">By all employees</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Total Paid</p>
                <p className="text-2xl sm:text-3xl font-bold text-green-600">
                  £{totalPaid.toFixed(2)}
                </p>
                <p className="text-xs text-gray-500 mt-1">Payments completed</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Outstanding Payments Alert */}
      {totalOutstanding > 0 && (
        <div className="card">
          <div className="card-body">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-amber-900 mb-1">Outstanding Payments</h3>
                <p className="text-sm text-amber-800">
                  £{totalOutstanding.toFixed(2)} owed across {employees.filter(emp => calculateEmployeeStats(emp.id).totalOwed > 0).length} employee{employees.filter(emp => calculateEmployeeStats(emp.id).totalOwed > 0).length !== 1 ? 's' : ''}
                </p>
                <button
                  onClick={handleNavigateToTeam}
                  className="mt-2 text-xs font-medium text-amber-700 hover:text-amber-900 transition-colors"
                >
                  View Details →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 