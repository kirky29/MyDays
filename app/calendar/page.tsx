'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday } from 'date-fns'
import { useFirebaseData } from '../../lib/hooks/useFirebaseData'
import { useAppStore } from '../../lib/store'
import type { Employee, WorkDay } from '../../lib/store'
import BottomNavigation from '../components/BottomNavigation'
import PaymentModal from '../components/PaymentModal'
import LoadingScreen from '../components/LoadingScreen'

interface DayViewData {
  date: string
  employees: {
    employee: Employee
    workDay?: WorkDay
  }[]
}

export default function CalendarPage() {
  const router = useRouter()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDayData, setSelectedDayData] = useState<DayViewData | null>(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedEmployeeForPayment, setSelectedEmployeeForPayment] = useState<Employee | null>(null)
  const [selectedWorkDaysForPayment, setSelectedWorkDaysForPayment] = useState<WorkDay[]>([])

  // Use the centralized store and data management
  const { 
    employees, 
    workDays, 
    loading, 
    toggleWorkDay, 
    togglePayment 
  } = useAppStore()

  // Initialize Firebase data loading
  useFirebaseData()

  const handleNavigate = (path: string) => {
    router.push(path)
  }

  const goToPreviousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1))
  }

  const goToNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1))
  }

  const getWorkDaysForDate = (date: string) => {
    return workDays.filter(day => day.date === date && day.worked)
  }

  const openDayView = (date: Date) => {
    const dateString = format(date, 'yyyy-MM-dd')
    const dayWorkDays = getWorkDaysForDate(dateString)
    
    const dayData: DayViewData = {
      date: dateString,
      employees: employees.map(employee => ({
        employee,
        workDay: dayWorkDays.find(wd => wd.employeeId === employee.id)
      }))
    }
    
    setSelectedDayData(dayData)
  }

  const openPaymentModal = (employee: Employee) => {
    // Get all unpaid work days for this employee
    const unpaidWorkDays = workDays.filter(day => 
      day.employeeId === employee.id && 
      day.worked && 
      !day.paid
    )
    
    setSelectedEmployeeForPayment(employee)
    setSelectedWorkDaysForPayment(unpaidWorkDays)
    setShowPaymentModal(true)
    setSelectedDayData(null) // Close day view
  }

  // Generate calendar days
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const calendarDays = eachDayOfInterval({
    start: monthStart,
    end: monthEnd
  })

  // Add padding days for calendar grid
  const startWeekday = monthStart.getDay()
  const paddingDays = Array.from({ length: startWeekday }, (_, i) => {
    const paddingDate = new Date(monthStart)
    paddingDate.setDate(paddingDate.getDate() - (startWeekday - i))
    return paddingDate
  })

  const allCalendarDays = [...paddingDays, ...calendarDays]

  if (loading) {
    return <LoadingScreen />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 pb-20 sm:pb-24">
      <div className="container mx-auto px-4 py-4 sm:py-6 max-w-md">
        {/* Header Section */}
        <div className="space-y-mobile">
          {/* Enhanced Header */}
          <div className="text-center mb-6 sm:mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 rounded-2xl sm:rounded-3xl shadow-lg mb-4 sm:mb-6 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>
              <div className="absolute top-1 right-1 w-3 h-3 bg-white/30 rounded-full"></div>
              <svg className="w-8 h-8 sm:w-10 sm:h-10 text-white relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">
              <span className="text-gradient">Work Calendar</span>
            </h1>
            <p className="text-gray-600 text-sm sm:text-base max-w-xs mx-auto leading-relaxed">
              Track daily work schedules and payments
            </p>
          </div>
        </div>

        {/* Month Navigation */}
        <div className="card mb-6">
          <div className="card-body pt-6">
            <div className="flex items-center justify-between">
              <button
                onClick={goToPreviousMonth}
                className="btn btn-secondary btn-md"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                {format(currentDate, 'MMMM yyyy')}
              </h2>
              
              <button
                onClick={goToNextMonth}
                className="btn btn-secondary btn-md"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="card mb-6">
          <div className="card-body">
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1 mb-3">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-xs font-semibold text-gray-600 py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar days */}
            <div className="grid grid-cols-7 gap-1">
              {allCalendarDays.map((date, index) => {
                const dateString = format(date, 'yyyy-MM-dd')
                const dayWorkDays = getWorkDaysForDate(dateString)
                const isCurrentMonth = isSameMonth(date, currentDate)
                const isCurrentDay = isToday(date)
                const hasWorkers = dayWorkDays.length > 0
                const hasUnpaid = dayWorkDays.some(wd => !wd.paid)
                const allPaid = dayWorkDays.length > 0 && dayWorkDays.every(wd => wd.paid)
                const unpaidCount = dayWorkDays.filter(wd => !wd.paid).length
                const totalWorkers = dayWorkDays.length

                return (
                  <button
                    key={index}
                    onClick={() => openDayView(date)}
                    className={`
                      aspect-square min-h-[52px] p-2 rounded-xl text-xs font-medium transition-all duration-200 relative group focus:outline-none focus:ring-2 focus:ring-blue-500 overflow-hidden flex flex-col items-center justify-start
                      ${!isCurrentMonth ? 'text-gray-300 opacity-50' : 
                        isCurrentDay ? 'bg-blue-100 text-blue-800 border-2 border-blue-300 shadow-sm' :
                        hasWorkers ? 
                          allPaid ? 'bg-green-100 text-green-800 hover:bg-green-200 border border-green-200 shadow-sm' :
                          hasUnpaid ? 'bg-amber-100 text-amber-800 hover:bg-amber-200 border border-amber-200 shadow-sm' :
                          'text-gray-700 hover:bg-gray-100 border border-gray-200'
                        : 'text-gray-700 hover:bg-gray-100 border border-gray-200 hover:shadow-sm'
                      }
                    `}
                  >
                    {/* Day number */}
                    <div className="font-bold mb-1 flex-shrink-0">
                      {format(date, 'd')}
                    </div>
                    
                    {/* Work status indicators - constrained container */}
                    <div className="flex-1 flex flex-col items-center justify-center min-h-0 w-full">
                      {hasWorkers && (
                        <div className="space-y-0.5">
                          {/* Worker count */}
                          <div className="flex justify-center">
                            <div className={`px-1 py-0.5 rounded-full text-xs font-semibold leading-none ${
                              allPaid 
                                ? 'bg-green-200 text-green-800' 
                                : 'bg-amber-200 text-amber-800'
                            }`}>
                              {totalWorkers}
                            </div>
                          </div>
                          
                          {/* Payment status */}
                          {hasUnpaid && (
                            <div className="flex justify-center">
                              <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Today indicator */}
                    {isCurrentDay && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-white shadow-sm"></div>
                    )}

                    {/* Enhanced hover tooltip */}
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-20 shadow-lg">
                      <div className="font-semibold">{format(date, 'EEEE, MMM d')}</div>
                      {hasWorkers ? (
                        <div className="mt-1">
                          {allPaid ? 
                            `✅ All ${totalWorkers} worker${totalWorkers !== 1 ? 's' : ''} paid` : 
                            `⚠️ ${unpaidCount} of ${totalWorkers} unpaid`
                          }
                        </div>
                      ) : (
                        <div className="mt-1 text-gray-300">No work scheduled</div>
                      )}
                      {/* Tooltip arrow */}
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Enhanced Legend */}
        <div className="card mb-6">
          <div className="card-header">
            <h3 className="text-sm font-bold text-gray-900">Calendar Guide</h3>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-green-100 border border-green-200 rounded-xl flex items-center justify-center shadow-sm">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                </div>
                <div>
                  <span className="text-sm font-semibold text-gray-900">All Paid</span>
                  <p className="text-xs text-gray-600">Green background</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-amber-100 border border-amber-200 rounded-xl flex items-center justify-center shadow-sm">
                  <div className="w-3 h-3 bg-amber-500 rounded-full animate-pulse"></div>
                </div>
                <div>
                  <span className="text-sm font-semibold text-gray-900">Unpaid</span>
                  <p className="text-xs text-gray-600">Orange with pulse dot</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-100 border-2 border-blue-300 rounded-xl relative shadow-sm">
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-white"></div>
                </div>
                <div>
                  <span className="text-sm font-semibold text-gray-900">Today</span>
                  <p className="text-xs text-gray-600">Blue border with dot</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gray-100 border border-gray-200 rounded-xl flex items-center justify-center shadow-sm">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                  </svg>
                </div>
                <div>
                  <span className="text-sm font-semibold text-gray-900">No Work</span>
                  <p className="text-xs text-gray-600">Gray background</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Day View Modal */}
        {selectedDayData && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="card max-w-md w-full max-h-[85vh] overflow-hidden">
              {/* Enhanced Header */}
              <div className="card-header bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-100 rounded-xl">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">
                        {format(new Date(selectedDayData.date), 'EEEE, MMMM d')}
                      </h3>
                      <p className="text-sm text-blue-600">Manage work day</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedDayData(null)}
                    className="p-2 hover:bg-white/50 rounded-xl transition-colors"
                  >
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Quick Summary */}
                {(() => {
                  const workedEmployees = selectedDayData.employees.filter(({ workDay }) => workDay?.worked)
                  const paidEmployees = workedEmployees.filter(({ workDay }) => workDay?.paid)
                  const totalEarned = workedEmployees.reduce((sum, { employee }) => 
                    sum + employee.dailyWage, 0)
                  const totalPaid = paidEmployees.reduce((sum, { employee }) => 
                    sum + employee.dailyWage, 0)
                  
                  if (workedEmployees.length === 0) {
                    return (
                      <div className="mt-4 p-3 bg-gray-50 rounded-xl border border-gray-100">
                        <div className="text-center text-sm text-gray-600">
                          <svg className="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 12H4" />
                          </svg>
                          No work scheduled for this day
                        </div>
                      </div>
                    )
                  }

                  return (
                    <div className="mt-4 grid grid-cols-3 gap-3">
                      <div className="text-center p-2 bg-white/60 rounded-xl border border-blue-100">
                        <div className="text-lg font-bold text-gray-900">{workedEmployees.length}</div>
                        <div className="text-xs text-gray-600">Working</div>
                      </div>
                      <div className="text-center p-2 bg-white/60 rounded-xl border border-blue-100">
                        <div className="text-lg font-bold text-green-600">£{totalPaid}</div>
                        <div className="text-xs text-gray-600">Paid</div>
                      </div>
                      <div className="text-center p-2 bg-white/60 rounded-xl border border-blue-100">
                        <div className="text-lg font-bold text-amber-600">£{totalEarned - totalPaid}</div>
                        <div className="text-xs text-gray-600">Outstanding</div>
                      </div>
                    </div>
                  )
                })()}
              </div>

              {/* Scrollable Body */}
              <div className="flex-1 overflow-y-auto">
                <div className="card-body">
                  {selectedDayData.employees.length === 0 ? (
                    <div className="text-center py-8">
                      <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <p className="text-gray-500 mb-2">No employees found</p>
                      <p className="text-sm text-gray-400">Add employees to start tracking work days</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                                             {selectedDayData.employees.map(({ employee, workDay }) => {
                         const currentAmount = employee.dailyWage
                         const isWorked = workDay?.worked || false
                         const isPaid = workDay?.paid || false
                        
                        return (
                          <div key={employee.id} className={`border-2 rounded-2xl p-4 transition-all ${
                            isWorked 
                              ? isPaid 
                                ? 'border-green-200 bg-green-50' 
                                : 'border-amber-200 bg-amber-50'
                              : 'border-gray-200 bg-white hover:border-gray-300'
                          }`}>
                            {/* Employee Header */}
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center space-x-3">
                                <div className={`avatar avatar-md ${
                                  isWorked 
                                    ? isPaid ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                                    : 'bg-gray-100 text-gray-600'
                                }`}>
                                  <span className="font-semibold">{employee.name.charAt(0).toUpperCase()}</span>
                                </div>
                                                                 <div>
                                   <h4 className="font-bold text-gray-900">{employee.name}</h4>
                                   <p className="text-sm text-gray-600">Daily rate: £{employee.dailyWage}</p>
                                 </div>
                              </div>
                              
                              {/* Status Badge */}
                              <div className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 ${
                                isWorked 
                                  ? isPaid 
                                    ? 'bg-green-100 text-green-800 border-green-200' 
                                    : 'bg-amber-100 text-amber-800 border-amber-200'
                                  : 'bg-gray-100 text-gray-600 border-gray-200'
                              }`}>
                                {isWorked 
                                  ? isPaid ? '✓ Paid' : '⏳ Worked - Unpaid'
                                  : '○ Not Worked'}
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="space-y-2">
                              {/* Work Status Button */}
                              <button
                                onClick={() => toggleWorkDay(employee.id, selectedDayData.date)}
                                className={`w-full p-3 rounded-xl font-semibold text-sm transition-all ${
                                  isWorked
                                    ? 'bg-blue-600 text-white hover:bg-blue-700 border-2 border-blue-600'
                                    : 'bg-white text-gray-700 hover:bg-gray-50 border-2 border-gray-300 hover:border-gray-400'
                                }`}
                              >
                                {isWorked 
                                  ? (
                                    <div className="flex items-center justify-center space-x-2">
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                      </svg>
                                      <span>Worked Today (Click to Remove)</span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-center space-x-2">
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                      </svg>
                                      <span>Mark as Worked</span>
                                    </div>
                                  )
                                }
                              </button>
                              
                              {/* Payment Button */}
                              {isWorked && (
                                <button
                                  onClick={() => togglePayment(employee.id, selectedDayData.date)}
                                  className={`w-full p-3 rounded-xl font-semibold text-sm transition-all ${
                                    isPaid
                                      ? 'bg-green-600 text-white hover:bg-green-700 border-2 border-green-600'
                                      : 'bg-amber-500 text-white hover:bg-amber-600 border-2 border-amber-500'
                                  }`}
                                >
                                  {isPaid ? (
                                    <div className="flex items-center justify-center space-x-2">
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                      </svg>
                                      <span>Paid £{currentAmount} (Click to Undo)</span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-center space-x-2">
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                                      </svg>
                                      <span>Mark Paid £{currentAmount}</span>
                                    </div>
                                  )}
                                </button>
                              )}

                              {/* Employee Profile Button */}
                              <button
                                onClick={() => {
                                  setSelectedDayData(null)
                                  router.push(`/employee/${employee.id}`)
                                }}
                                className="w-full p-2 text-blue-600 hover:bg-blue-50 rounded-xl text-sm font-medium transition-colors"
                              >
                                View Employee Profile →
                              </button>
                            </div>

                            
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Payment Modal */}
        {showPaymentModal && selectedEmployeeForPayment && (
          <PaymentModal
            isOpen={showPaymentModal}
            onClose={() => {
              setShowPaymentModal(false)
              setSelectedEmployeeForPayment(null)
              setSelectedWorkDaysForPayment([])
            }}
            employee={selectedEmployeeForPayment}
            selectedWorkDays={selectedWorkDaysForPayment}
            onPaymentComplete={() => {
              setShowPaymentModal(false)
              setSelectedEmployeeForPayment(null)
              setSelectedWorkDaysForPayment([])
            }}
          />
        )}
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation onNavigate={handleNavigate} />
    </div>
  )
} 