import { useAppStore } from '../../lib/store'

export default function BusinessOverview() {
  const { employees, workDays, calculateEmployeeStats } = useAppStore()

  if (employees.length === 0) return null

  const totalOutstanding = employees.reduce((total, emp) => {
    const stats = calculateEmployeeStats(emp.id)
    return total + stats.totalOwed
  }, 0)

  return (
    <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl shadow-lg p-6 text-white mb-6">
      <div className="flex items-center mb-4">
        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mr-3">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-semibold">Business Overview</h2>
          <p className="text-white/80 text-sm">Your workspace at a glance</p>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white/10 rounded-xl p-4">
          <div className="text-2xl font-bold mb-1">{employees.length}</div>
          <div className="text-white/80 text-sm">Total Employees</div>
        </div>
        <div className="bg-white/10 rounded-xl p-4">
          <div className="text-2xl font-bold mb-1">{workDays.filter(day => day.worked).length}</div>
          <div className="text-white/80 text-sm">Work Days Logged</div>
        </div>
        <div className="bg-white/10 rounded-xl p-4">
          <div className="text-2xl font-bold mb-1">{workDays.filter(day => day.paid).length}</div>
          <div className="text-white/80 text-sm">Days Paid</div>
        </div>
        <div className="bg-white/10 rounded-xl p-4">
          <div className="text-2xl font-bold mb-1 text-yellow-400">
            £{totalOutstanding.toFixed(0)}
          </div>
          <div className="text-white/80 text-sm">Outstanding</div>
        </div>
      </div>
    </div>
  )
} 