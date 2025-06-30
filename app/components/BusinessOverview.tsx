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
      {/* Payment Summary Cards - Main Focus */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4">
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