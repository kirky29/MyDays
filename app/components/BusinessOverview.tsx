import { useAppStore } from '../../lib/store'

export default function BusinessOverview() {
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

  return (
    <div className="mb-6">
      {/* Main Overview Card */}
      <div className="card">
        <div className="card-body">
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mr-3">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Business Overview</h2>
              <p className="text-sm text-gray-600">Your workspace at a glance</p>
            </div>
          </div>
          
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {workDays.filter(day => day.worked).length}
              </div>
              <div className="text-xs text-gray-600 font-medium">Work Days</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {workDays.filter(day => day.paid).length}
              </div>
              <div className="text-xs text-gray-600 font-medium">Paid Days</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {employees.length}
              </div>
              <div className="text-xs text-gray-600 font-medium">Team Size</div>
            </div>
          </div>

          {/* Financial Summary */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 rounded-xl p-3 text-center">
              <div className="text-lg font-bold text-blue-600">£{totalEarned.toFixed(0)}</div>
              <div className="text-xs text-blue-800 font-medium">Total Earned</div>
            </div>
            <div className="bg-green-50 rounded-xl p-3 text-center">
              <div className="text-lg font-bold text-green-600">£{totalPaid.toFixed(0)}</div>
              <div className="text-xs text-green-800 font-medium">Total Paid</div>
            </div>
          </div>
        </div>
      </div>

      {/* Outstanding Alert */}
      {totalOutstanding > 0 && (
        <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-amber-800">
              £{totalOutstanding.toFixed(2)} in outstanding payments across {employees.filter(emp => calculateEmployeeStats(emp.id).totalOwed > 0).length} employee{employees.filter(emp => calculateEmployeeStats(emp.id).totalOwed > 0).length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      )}
    </div>
  )
} 