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

  const workMetrics = [
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
    }
  ]

  const paymentSummary = [
    {
      label: "Total Paid Out",
      value: totalPaid,
      color: "green",
      icon: "💳",
      description: "Amount you've paid to employees"
    },
    {
      label: "Total Outstanding",
      value: totalOutstanding,
      color: totalOutstanding > 0 ? "amber" : "green",
      icon: "💰",
      description: "Amount still owed to employees"
    },
    {
      label: "Total Earned",
      value: totalEarned,
      color: "blue",
      icon: "📈",
      description: "Total amount employees have earned"
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold">Payment Overview</h2>
              <p className="text-white/80 text-sm">Track your financial commitments</p>
            </div>
          </div>
          
          {/* Work Days Metrics - Smaller, Secondary */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {workMetrics.map((metric) => (
              <button
                key={metric.label}
                onClick={metric.onClick}
                className="bg-white/5 backdrop-blur-sm rounded-lg p-3 border border-white/10 hover:bg-white/10 transition-all duration-200 text-left group"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm group-hover:scale-110 transition-transform duration-200">{metric.icon}</span>
                  <div className="text-lg font-semibold text-white">
                    {metric.value}{metric.suffix}
                  </div>
                </div>
                <div className="text-white/70 text-xs font-medium">
                  {metric.label}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Payment Summary Cards - Main Focus */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {paymentSummary.map((item) => (
          <div key={item.label} className="card hover:shadow-lg transition-shadow duration-200">
            <div className="card-body py-4 sm:py-5">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center ${
                  item.color === 'green' ? 'bg-green-100' : 
                  item.color === 'amber' ? 'bg-amber-100' : 'bg-blue-100'
                }`}>
                  <span className="text-lg sm:text-xl">{item.icon}</span>
                </div>
                <div className="text-right">
                  <p className={`text-xl sm:text-2xl font-bold ${
                    item.color === 'green' ? 'text-green-600' : 
                    item.color === 'amber' ? 'text-amber-600' : 'text-blue-600'
                  }`}>
                    £{item.value.toFixed(2)}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800 mb-1">{item.label}</p>
                <p className="text-xs text-gray-500">{item.description}</p>
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