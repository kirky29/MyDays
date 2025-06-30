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
    <div className="px-4 pb-6 space-y-4">
      {/* Payment Summary Cards - Mobile First */}
      {paymentSummary.map((item) => (
        <div key={item.label} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                  item.color === 'green' ? 'bg-green-100' : 
                  item.color === 'amber' ? 'bg-amber-100' : 'bg-blue-100'
                }`}>
                  <span className="text-xl">{item.icon}</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-gray-900 mb-1">
                    {item.label}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {item.description}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-2xl font-bold ${
                  item.color === 'green' ? 'text-green-600' : 
                  item.color === 'amber' ? 'text-amber-600' : 'text-blue-600'
                }`}>
                  £{item.value.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
} 