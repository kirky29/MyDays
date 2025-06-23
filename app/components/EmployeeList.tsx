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
      <div className="text-center py-8 sm:py-12">
        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6">
          <svg className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
          </svg>
        </div>
        <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">No employees yet</h3>
        <p className="text-gray-600 mb-6 sm:mb-8 text-sm sm:text-base max-w-sm mx-auto">
          Add your first employee to start tracking work days and payments
        </p>
        
        {/* Enhanced onboarding steps */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 max-w-sm mx-auto shadow-sm border border-gray-100">
          <h4 className="text-sm font-semibold text-gray-800 mb-4">Get started in 3 steps:</h4>
          <div className="space-y-3">
            {[
              { step: 1, text: "Add employee", icon: "👤" },
              { step: 2, text: "Set up profile", icon: "📝" },
              { step: 3, text: "Track work", icon: "⏰" }
            ].map(({ step, text, icon }) => (
              <div key={step} className="flex items-center space-x-3 text-sm">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-600 font-bold text-xs">{step}</span>
                </div>
                <span className="text-gray-600">{text}</span>
                <span className="text-lg">{icon}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Your Team</h2>
          <p className="text-sm text-gray-600 mt-1">
            {employees.length} employee{employees.length !== 1 ? 's' : ''} • Tap to view details
          </p>
        </div>
      </div>
      
      <div className="space-y-3 sm:space-y-4">
        {employees.map(employee => {
          const stats = calculateEmployeeStats(employee.id)
          return (
            <div key={employee.id} className="card group cursor-pointer" onClick={() => navigateToEmployee(employee.id)}>
              {/* Employee Header */}
              <div className="card-header">
                <div className="flex items-start space-x-3 sm:space-x-4 mb-4">
                  <div className="avatar avatar-lg flex-shrink-0">
                    <span>{employee.name.charAt(0).toUpperCase()}</span>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900 text-base sm:text-lg truncate">
                          {employee.name}
                        </h3>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-sm font-medium text-blue-600">
                            £{employee.dailyWage}/day
                          </span>
                          {employee.startDate && (
                            <>
                              <span className="text-gray-300">•</span>
                              <span className="text-xs text-gray-500">
                                Started {format(new Date(employee.startDate), 'MMM d, yyyy')}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 ml-2">
                        <div className={`status-indicator ${stats.totalOwed > 0 ? 'status-warning' : 'status-success'}`}></div>
                        <svg className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Enhanced Stats Grid */}
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  <div className="stat-card bg-blue-50">
                    <div className="stat-value text-blue-600">{stats.totalWorked}</div>
                    <div className="stat-label text-blue-800">Days Worked</div>
                  </div>
                  <div className="stat-card bg-green-50">
                    <div className="stat-value text-green-600">{stats.totalPaid}</div>
                    <div className="stat-label text-green-800">Days Paid</div>
                  </div>
                  <div className="stat-card bg-gray-50">
                    <div className={`stat-value ${stats.totalOwed > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      £{stats.totalOwed.toFixed(0)}
                    </div>
                    <div className="stat-label text-gray-600">Outstanding</div>
                  </div>
                </div>
              </div>

              {/* Enhanced Financial Summary */}
              <div className="card-footer">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm">
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-gray-600">
                        Earned: <span className="font-medium text-gray-900">£{stats.totalEarned.toFixed(2)}</span>
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-gray-600">
                        Paid: <span className="font-medium text-green-600">£{(stats.totalPaid * employee.dailyWage).toFixed(2)}</span>
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between sm:justify-end">
                    <div className={`text-xs sm:text-sm font-semibold ${stats.totalOwed > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {stats.totalOwed > 0 ? `£${stats.totalOwed.toFixed(2)} owed` : '✓ All paid up!'}
                    </div>
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