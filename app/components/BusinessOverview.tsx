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

  const metrics = [
    {
      label: "Team Members",
      value: employees.length,
      icon: "👥",
      color: "blue",
      suffix: "",
      onClick: () => router.push('/')
    },
    {
      label: "Work Days",
      value: workDays.filter(day => day.worked).length,
      icon: "📅",
      color: "indigo",
      suffix: "",
      onClick: () => router.push('/')
    },
    {
      label: "Days Paid",
      value: workDays.filter(day => day.paid).length,
      icon: "✅",
      color: "green",
      suffix: "",
      onClick: () => router.push('/')
    },
    {
      label: "Outstanding",
      value: totalOutstanding,
      icon: "💰",
      color: totalOutstanding > 0 ? "amber" : "green",
      suffix: "£",
      prefix: true,
      onClick: () => router.push('/')
    }
  ]

  const financialSummary = [
    {
      label: "Total Employees have earned",
      value: totalEarned,
      color: "blue",
      icon: "📈"
    },
    {
      label: "Total Currently Paid Out",
      value: totalPaid,
      color: "green",
      icon: "✅"
    }
  ]

  return (
    <div className="mb-6">
      {/* Main Overview Card */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl shadow-lg p-4 sm:p-6 text-white mb-4 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20"></div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-16 translate-x-16"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-12 -translate-x-12"></div>
        </div>
        
        {/* Header */}
        <div className="relative">
          <div className="flex items-center mb-4 sm:mb-6">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-xl flex items-center justify-center mr-3 backdrop-blur-sm">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold">Business Overview</h2>
              <p className="text-white/80 text-sm">Your workspace at a glance</p>
            </div>
          </div>
          
          {/* Clickable Metrics Grid */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {metrics.map((metric) => (
              <button
                key={metric.label}
                onClick={metric.onClick}
                className="bg-white/10 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-white/20 hover:bg-white/20 transition-all duration-200 text-left group"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-lg sm:text-xl group-hover:scale-110 transition-transform duration-200">{metric.icon}</span>
                  <div className="text-right">
                    <div className="text-xl sm:text-2xl font-bold text-white">
                      {metric.prefix ? `${metric.suffix}${metric.value.toFixed(0)}` : `${metric.value}${metric.suffix}`}
                    </div>
                  </div>
                </div>
                <div className="text-white/80 text-xs sm:text-sm font-medium">
                  {metric.label}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {financialSummary.map((item) => (
          <div key={item.label} className="card">
            <div className="card-body py-4 sm:py-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-2">{item.label}</p>
                  <p className={`text-xl sm:text-2xl font-bold ${
                    item.color === 'green' ? 'text-green-600' : 'text-blue-600'
                  }`}>
                    £{item.value.toFixed(2)}
                  </p>
                </div>
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center ${
                  item.color === 'green' ? 'bg-green-100' : 'bg-blue-100'
                }`}>
                  <span className="text-lg sm:text-xl">{item.icon}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Outstanding Payments Alert */}
      {totalOutstanding > 0 && (
        <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-3 sm:p-4">
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