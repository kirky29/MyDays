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
    <div className="mb-8">
      {/* Enhanced Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center space-x-3 mb-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Your Team</h2>
          </div>
        </div>
        <p className="text-sm text-gray-600 ml-11">
          {employees.length} employee{employees.length !== 1 ? 's' : ''} • Tap any card to view details
        </p>
      </div>
      
      <div className="space-y-4 sm:space-y-5">
        {employees.map(employee => {
          const stats = calculateEmployeeStats(employee.id)
          return (
            <div key={employee.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:border-gray-200 transition-all duration-200 group cursor-pointer overflow-hidden" onClick={() => navigateToEmployee(employee.id)}>
              {/* Employee Header */}
              <div className="p-5 sm:p-6">
                <div className="flex items-start space-x-4 mb-5">
                  {/* Enhanced Avatar */}
                  <div className="relative">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-sm">
                      <span className="text-white font-semibold text-lg sm:text-xl">
                        {employee.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${stats.totalOwed > 0 ? 'bg-amber-400' : 'bg-green-400'}`}></div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-900 text-lg sm:text-xl mb-1 truncate">
                          {employee.name}
                        </h3>
                        <div className="flex items-center space-x-2 mb-2">
                          <div className="bg-blue-100 text-blue-700 px-2 py-1 rounded-lg text-sm font-semibold">
                            £{employee.dailyWage}/day
                          </div>
                          {employee.startDate && (
                            <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-lg">
                              Started {format(new Date(employee.startDate), 'MMM d, yyyy')}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 ml-3">
                        <svg className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Enhanced Stats Grid */}
                <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-5">
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-center">
                    <div className="text-xl sm:text-2xl font-bold text-blue-600 mb-1">{stats.totalWorked}</div>
                    <div className="text-xs font-medium text-blue-700">Days Worked</div>
                  </div>
                  <div className="bg-green-50 border border-green-100 rounded-xl p-3 text-center">
                    <div className="text-xl sm:text-2xl font-bold text-green-600 mb-1">{stats.totalPaid}</div>
                    <div className="text-xs font-medium text-green-700">Days Paid</div>
                  </div>
                  <div className={`${stats.totalOwed > 0 ? 'bg-amber-50 border-amber-100' : 'bg-gray-50 border-gray-100'} border rounded-xl p-3 text-center`}>
                    <div className={`text-xl sm:text-2xl font-bold mb-1 ${stats.totalOwed > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                      £{stats.totalOwed.toFixed(0)}
                    </div>
                    <div className={`text-xs font-medium ${stats.totalOwed > 0 ? 'text-amber-700' : 'text-gray-600'}`}>Outstanding</div>
                  </div>
                </div>

                {/* Enhanced Financial Summary */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-700">Financial Summary</span>
                    <div className={`text-sm font-bold px-2 py-1 rounded-lg ${stats.totalOwed > 0 ? 'text-amber-700 bg-amber-100' : 'text-green-700 bg-green-100'}`}>
                      {stats.totalOwed > 0 ? `£${stats.totalOwed.toFixed(2)} owed` : 'All paid up!'}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span className="text-gray-600">Total Earned</span>
                      </div>
                      <span className="font-semibold text-gray-900">£{stats.totalEarned.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-gray-600">Total Paid</span>
                      </div>
                      <span className="font-semibold text-green-600">£{(stats.totalPaid * employee.dailyWage).toFixed(2)}</span>
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