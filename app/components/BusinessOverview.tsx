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
    return total + stats.actualPaidAmount
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
    <div className="bg-gray-50 px-4 py-6 mb-8">
      {/* Payment Summary Cards - 3 Column Grid */}
      <div className="grid grid-cols-3 gap-3">
        {paymentSummary.map((item) => (
          <div key={item.label} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-3">
              <div className="text-center">
                <div className={`w-10 h-10 mx-auto rounded-xl flex items-center justify-center mb-2 ${
                  item.color === 'green' ? 'bg-green-100' : 
                  item.color === 'amber' ? 'bg-amber-100' : 'bg-blue-100'
                }`}>
                  <span className="text-lg">{item.icon}</span>
                </div>
                <p className={`text-lg font-bold mb-1 ${
                  item.color === 'green' ? 'text-green-600' : 
                  item.color === 'amber' ? 'text-amber-600' : 'text-blue-600'
                }`}>
                  £{item.value.toFixed(2)}
                </p>
                <h3 className="text-xs font-semibold text-gray-800 mb-1">
                  {item.label}
                </h3>
                <p className="text-xs text-gray-500 leading-tight">
                  {item.description}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
} 