import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { useAppStore } from '../../lib/store'

export default function EmployeeList() {
  const router = useRouter()
  const { employees, calculateEmployeeStats } = useAppStore()

  const navigateToEmployee = (employeeId: string) => {
    router.push(`/employee/${employeeId}`)
  }

  const navigateToAddEmployee = () => {
    router.push('/add-employee')
  }

  if (employees.length === 0) {
    return (
      <div className="bg-white mx-4 rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
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
        <div className="bg-gray-50 rounded-xl p-4 sm:p-6 max-w-sm mx-auto border border-gray-200">
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
    <div className="px-4">
      {/* Employee Cards with better separation */}
      <div className="space-y-6">
        {employees.map(employee => {
          const stats = calculateEmployeeStats(employee.id)
          return (
            <div key={employee.id} className="bg-white rounded-2xl shadow-md border-2 border-gray-200 hover:shadow-lg hover:border-blue-300 transition-all duration-200 group cursor-pointer overflow-hidden" onClick={() => navigateToEmployee(employee.id)}>
              {/* Employee Header */}
              <div className="p-6">
                <div className="flex items-center space-x-4 mb-6">
                  {/* Enhanced Avatar */}
                  <div className="relative">
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
                      <span className="text-white font-semibold text-xl">
                        {employee.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-3 border-white shadow-sm ${stats.totalOwed > 0 ? 'bg-amber-400' : 'bg-green-400'}`}></div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-900 text-xl truncate">
                          {employee.name}
                        </h3>
                        <div className="flex items-center space-x-3 mt-1">
                          {employee.startDate && (
                            <div className="text-xs text-gray-600 bg-gray-100 px-3 py-1.5 rounded-xl border border-gray-200">
                              Started {format(new Date(employee.startDate), 'MMM d, yyyy')}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 ml-3">
                        <svg className="w-6 h-6 text-gray-400 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Enhanced Stats Grid with stronger borders */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 text-center flex flex-col items-center justify-center shadow-sm">
                    <div className="text-2xl font-bold text-blue-600 mb-1">{stats.totalWorked}</div>
                    <div className="text-xs font-semibold text-blue-700">Days Worked</div>
                  </div>
                  <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 text-center flex flex-col items-center justify-center shadow-sm">
                    <div className="text-2xl font-bold text-green-600 mb-1">{stats.totalPaid}</div>
                    <div className="text-xs font-semibold text-green-700">Days Paid</div>
                  </div>
                  <div className={`${stats.totalOwed > 0 ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200'} border-2 rounded-xl p-4 text-center flex flex-col items-center justify-center shadow-sm`}>
                    <div className={`text-2xl font-bold mb-1 ${stats.totalOwed > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                      £{stats.totalOwed.toFixed(0)}
                    </div>
                    <div className={`text-xs font-semibold ${stats.totalOwed > 0 ? 'text-amber-700' : 'text-gray-600'}`}>Outstanding</div>
                  </div>
                </div>

                {/* Enhanced Financial Summary with daily wage */}
                <div className="bg-gray-100 border-2 border-gray-200 rounded-xl p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-semibold text-gray-800">Financial Summary</span>
                    <div className="bg-blue-100 text-blue-800 px-3 py-1.5 rounded-xl text-sm font-semibold border-2 border-blue-200">
                      £{employee.dailyWage}/day
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <span className="text-gray-700 font-medium">Total Earned</span>
                      </div>
                      <span className="font-bold text-gray-900">£{stats.totalEarned.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="text-gray-700 font-medium">Total Paid</span>
                      </div>
                      <span className="font-bold text-green-600">£{stats.actualPaidAmount.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
        
        {/* Add New Employee Button */}
        <div className="bg-white rounded-2xl shadow-sm border-2 border-dashed border-gray-300 hover:border-blue-400 transition-all duration-200 overflow-hidden">
          <button
            onClick={navigateToAddEmployee}
            className="w-full p-8 text-center hover:bg-gradient-to-br hover:from-blue-50 hover:to-indigo-50 transition-all duration-200 group"
          >
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:scale-110 transition-transform duration-200">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            
            <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
              Add New Employee
            </h3>
            <p className="text-gray-600 text-sm mb-4 max-w-sm mx-auto">
              Add another team member to track their work and payments
            </p>
            
            <div className="inline-flex items-center text-blue-600 font-semibold text-sm group-hover:text-blue-700 transition-colors">
              <span>Get Started</span>
              <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
} 