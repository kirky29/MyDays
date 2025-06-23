import { useState } from 'react'
import { format } from 'date-fns'
import { useAppStore } from '../../lib/store'

export default function WorkDayTracker() {
  const { employees, syncStatus, toggleWorkDay, togglePayment, getWorkDay } = useAppStore()
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))

  if (employees.length === 0) return null

  return (
    <div className="card mb-6">
      {/* Header */}
      <div className="card-header">
        <div className="flex items-center mb-4 sm:mb-6">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-xl flex items-center justify-center mr-3 sm:mr-4">
            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">Quick Work Tracker</h2>
            <p className="text-sm text-gray-600 mt-1">
              Mark work days for {format(new Date(selectedDate), 'EEEE, MMM d')}
            </p>
          </div>
        </div>
        
        {/* Enhanced Date Selector */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-3">Select Date</label>
          <div className="relative">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-4 py-3 sm:py-4 border border-gray-300 rounded-xl bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-base"
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Employee Work Status */}
      <div className="card-body">
        <div className="space-y-4">
          {employees.map(employee => {
            const workDay = getWorkDay(employee.id, selectedDate)
            const isWorked = workDay?.worked || false
            const isPaid = workDay?.paid || false
            const isLoading = syncStatus === 'syncing'
            
            return (
              <div key={employee.id} className="border border-gray-200 rounded-xl p-4 hover:bg-gray-50/50 transition-all duration-200">
                {/* Employee Info */}
                <div className="flex items-center mb-4">
                  <div className="avatar avatar-md mr-3 flex-shrink-0">
                    <span>{employee.name.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{employee.name}</h3>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-sm font-medium text-blue-600">£{employee.dailyWage}/day</span>
                      {isWorked && (
                        <>
                          <span className="text-gray-300">•</span>
                          <span className="text-xs text-green-600 font-medium">
                            Earning: £{employee.dailyWage}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {/* Status Indicator */}
                  <div className="flex items-center space-x-1">
                    {isWorked && (
                      <div className={`status-indicator ${isPaid ? 'status-success' : 'status-warning'}`}></div>
                    )}
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Work Day Button */}
                  <button
                    onClick={() => toggleWorkDay(employee.id, selectedDate)}
                    disabled={isLoading}
                    className={`
                      btn btn-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed
                      ${isWorked 
                        ? 'btn-primary shadow-md' 
                        : 'btn-secondary hover:border-blue-300'
                      }
                    `}
                  >
                    {isWorked ? (
                      <div className="flex items-center justify-center">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="font-semibold">Worked</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        <span>Mark Worked</span>
                      </div>
                    )}
                  </button>
                  
                  {/* Payment Button */}
                  <button
                    onClick={() => togglePayment(employee.id, selectedDate)}
                    disabled={!isWorked || isLoading}
                    className={`
                      btn btn-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed
                      ${isPaid
                        ? 'btn-success shadow-md'
                        : isWorked
                        ? 'btn-warning'
                        : 'btn-secondary'
                      }
                    `}
                  >
                    {isPaid ? (
                      <div className="flex items-center justify-center">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                        </svg>
                        <span className="font-semibold">Paid</span>
                      </div>
                    ) : isWorked ? (
                      <div className="flex items-center justify-center">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                        </svg>
                        <span>Mark Paid</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center">
                        <svg className="w-4 h-4 mr-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
                        </svg>
                        <span className="opacity-75">Not Available</span>
                      </div>
                    )}
                  </button>
                </div>
                
                {/* Quick Summary */}
                {isWorked && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">
                        Status: <span className={`font-medium ${isPaid ? 'text-green-600' : 'text-amber-600'}`}>
                          {isPaid ? 'Paid' : 'Pending Payment'}
                        </span>
                      </span>
                      <span className="font-medium text-gray-900">
                        £{employee.dailyWage}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
} 