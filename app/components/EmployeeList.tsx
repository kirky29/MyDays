import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { useAppStore } from '../../lib/store'

export default function EmployeeList() {
  const router = useRouter()
  const { employees, calculateEmployeeStats } = useAppStore()

  const navigateToEmployee = (employeeId: string) => {
    router.push(`/employee/${employeeId}`)
  }

  if (employees.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No employees yet</h3>
        <p className="text-gray-600 mb-6">Add your first employee to start tracking work days and payments</p>
        <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
          <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-blue-600 font-bold text-xs">1</span>
          </div>
          <span>Add employee</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
          <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-blue-600 font-bold text-xs">2</span>
          </div>
          <span>Set up profile</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
          <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-blue-600 font-bold text-xs">3</span>
          </div>
          <span>Track work</span>
        </div>
      </div>
    )
  }

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Your Team</h2>
      </div>
      
      <div className="space-y-4">
        {employees.map(employee => {
          const stats = calculateEmployeeStats(employee.id)
          return (
            <div key={employee.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all duration-200">
              {/* Employee Header */}
              <div className="p-5 pb-4">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                      <span className="text-white font-semibold text-lg">
                        {employee.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 text-lg">{employee.name}</h3>
                      <p className="text-sm text-gray-600">£{employee.dailyWage}/day</p>
                      {employee.startDate && (
                        <p className="text-xs text-gray-500">
                          Started {format(new Date(employee.startDate), 'MMM d, yyyy')}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={() => navigateToEmployee(employee.id)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
                    >
                      View Profile
                    </button>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-blue-50 rounded-xl p-3 text-center">
                    <div className="text-2xl font-bold text-blue-600">{stats.totalWorked}</div>
                    <div className="text-xs text-blue-800 font-medium">Days Worked</div>
                  </div>
                  <div className="bg-green-50 rounded-xl p-3 text-center">
                    <div className="text-2xl font-bold text-green-600">{stats.totalPaid}</div>
                    <div className="text-xs text-green-800 font-medium">Days Paid</div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3 text-center">
                    <div className={`text-2xl font-bold ${stats.totalOwed > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      £{stats.totalOwed.toFixed(0)}
                    </div>
                    <div className="text-xs text-gray-600 font-medium">Outstanding</div>
                  </div>
                </div>
              </div>

              {/* Financial Summary */}
              <div className="bg-gray-50 px-5 py-4">
                <div className="flex justify-between items-center text-sm">
                  <div className="flex space-x-4">
                    <span className="text-gray-600">
                      Earned: <span className="font-medium text-gray-900">£{stats.totalEarned.toFixed(2)}</span>
                    </span>
                    <span className="text-gray-600">
                      Paid: <span className="font-medium text-green-600">£{(stats.totalPaid * employee.dailyWage).toFixed(2)}</span>
                    </span>
                  </div>
                  <div className={`font-semibold ${stats.totalOwed > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {stats.totalOwed > 0 ? `£${stats.totalOwed.toFixed(2)} owed` : 'All paid up!'}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
} 