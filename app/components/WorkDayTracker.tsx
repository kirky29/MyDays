import { useState } from 'react'
import { format } from 'date-fns'
import { useAppStore } from '../../lib/store'

export default function WorkDayTracker() {
  const { employees, syncStatus, toggleWorkDay, togglePayment, getWorkDay } = useAppStore()
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))

  if (employees.length === 0) return null

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
      <div className="flex items-center mb-4">
        <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center mr-3">
          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Quick Work Tracker</h2>
          <p className="text-sm text-gray-600">Mark work days for {format(new Date(selectedDate), 'EEEE, MMM d')}</p>
        </div>
      </div>
      
      {/* Date Selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Select Date</label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
        />
      </div>

      {/* Employee Work Status */}
      <div className="space-y-3">
        {employees.map(employee => {
          const workDay = getWorkDay(employee.id, selectedDate)
          return (
            <div key={employee.id} className="border border-gray-200 rounded-xl p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-semibold text-sm">
                      {employee.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{employee.name}</h3>
                    <p className="text-sm text-gray-600">£{employee.dailyWage}/day</p>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => toggleWorkDay(employee.id, selectedDate)}
                  disabled={syncStatus === 'syncing'}
                  className={`py-2.5 px-4 rounded-xl text-sm font-medium transition-all duration-200 disabled:opacity-50 ${
                    workDay?.worked
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {workDay?.worked ? (
                    <div className="flex items-center justify-center">
                      <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Worked
                    </div>
                  ) : (
                    'Mark Worked'
                  )}
                </button>
                
                <button
                  onClick={() => togglePayment(employee.id, selectedDate)}
                  disabled={!workDay?.worked || syncStatus === 'syncing'}
                  className={`py-2.5 px-4 rounded-xl text-sm font-medium transition-all duration-200 disabled:opacity-50 ${
                    workDay?.paid
                      ? 'bg-green-600 text-white shadow-sm'
                      : workDay?.worked
                      ? 'bg-amber-500 text-white hover:bg-amber-600'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {workDay?.paid ? (
                    <div className="flex items-center justify-center">
                      <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                      Paid
                    </div>
                  ) : workDay?.worked ? (
                    'Mark Paid'
                  ) : (
                    'Not Available'
                  )}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
} 