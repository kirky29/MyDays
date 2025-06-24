'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, addMonths, subMonths, isToday } from 'date-fns'
import { useFirebaseData } from '../../lib/hooks/useFirebaseData'
import { useAppStore } from '../../lib/store'
import type { Employee, WorkDay } from '../../lib/store'
import BottomNavigation from '../components/BottomNavigation'
import PaymentModal from '../components/PaymentModal'
import LoadingScreen from '../components/LoadingScreen'

export default function CalendarPage() {
  const router = useRouter()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedEmployeeForPayment, setSelectedEmployeeForPayment] = useState<Employee | null>(null)
  const [selectedWorkDaysForPayment, setSelectedWorkDaysForPayment] = useState<WorkDay[]>([])

  // Use the centralized store and data management
  const { 
    employees, 
    workDays, 
    loading
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
    // Show both completed work (worked: true) and scheduled work (worked: false)
    return workDays.filter(day => day.date === date)
  }

  const openDayView = (date: Date) => {
    const dateString = format(date, 'yyyy-MM-dd')
    router.push(`/calendar/${dateString}`)
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
                
                // Get employee work for this day (excluding day notes)
                const employeeWork = dayWorkDays.filter(wd => wd.employeeId !== 'day-note')
                const dayNotes = dayWorkDays.filter(wd => wd.employeeId === 'day-note')
                const hasPaidWork = employeeWork.some(wd => wd.paid)
                
                // Employee color mapping (consistent colors for each employee)
                const getEmployeeColor = (employeeId: string, index: number) => {
                  const colors = ['bg-blue-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500', 'bg-orange-500']
                  const employee = employees.find(e => e.id === employeeId)
                  if (employee) {
                    const employeeIndex = employees.findIndex(e => e.id === employeeId)
                    return colors[employeeIndex % colors.length]
                  }
                  return colors[index % colors.length]
                }

                return (
                  <button
                    key={index}
                    onClick={() => openDayView(date)}
                    className={`
                      aspect-square min-h-[52px] p-2 rounded-xl text-xs font-medium transition-all duration-200 relative group focus:outline-none focus:ring-2 focus:ring-blue-500 overflow-hidden flex flex-col items-center justify-start
                      ${!isCurrentMonth ? 'text-gray-300 opacity-50' : 
                        isCurrentDay ? 'bg-blue-100 text-blue-800 border-2 border-blue-300 shadow-sm' :
                        'text-gray-700 hover:bg-gray-100 border border-gray-200 hover:shadow-sm'
                      }
                    `}
                  >
                    {/* Day number */}
                    <div className="font-bold mb-1 flex-shrink-0">
                      {format(date, 'd')}
                    </div>
                    
                    {/* Status dots */}
                    <div className="flex-1 flex flex-col items-center justify-center min-h-0 w-full">
                      <div className="flex flex-wrap justify-center gap-0.5 max-w-8">
                        {/* Employee work dots */}
                        {employeeWork.slice(0, 4).map((workDay, idx) => (
                          <div
                            key={workDay.id}
                            className={`w-1.5 h-1.5 rounded-full ${getEmployeeColor(workDay.employeeId, idx)} ${
                              workDay.worked === false ? 'opacity-60' : '' // Dimmed for scheduled work
                            }`}
                            title={`${employees.find(e => e.id === workDay.employeeId)?.name || 'Employee'} - ${workDay.worked ? 'Working' : 'Scheduled'}`}
                          />
                        ))}
                        
                        {/* More employees indicator */}
                        {employeeWork.length > 4 && (
                          <div className="w-1.5 h-1.5 rounded-full bg-gray-400" title={`+${employeeWork.length - 4} more`} />
                        )}
                        
                        {/* Payment dot (green) */}
                        {hasPaidWork && (
                          <div className="w-2 h-2 rounded-full bg-green-500 border border-white" title="Has payments" />
                        )}
                        
                        {/* Day notes dot (grey) */}
                        {dayNotes.length > 0 && (
                          <div className="w-1.5 h-1.5 rounded-full bg-gray-500" title="Has day notes" />
                        )}
                      </div>
                    </div>

                    {/* Today indicator */}
                    {isCurrentDay && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-white shadow-sm"></div>
                    )}

                    {/* Enhanced hover tooltip */}
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-20 shadow-lg">
                      <div className="font-semibold">{format(date, 'EEEE, MMM d')}</div>
                      {employeeWork.length > 0 && (
                        <div className="mt-1">
                          {employeeWork.map(wd => {
                            const employee = employees.find(e => e.id === wd.employeeId)
                            return (
                              <div key={wd.id} className="text-xs">
                                {employee?.name}: {wd.worked ? (wd.paid ? '✅ Paid' : '💰 Unpaid') : '📅 Scheduled'}
                              </div>
                            )
                          })}
                        </div>
                      )}
                      {dayNotes.length > 0 && (
                        <div className="mt-1 text-xs text-gray-300">📝 {dayNotes.length} note{dayNotes.length !== 1 ? 's' : ''}</div>
                      )}
                      {employeeWork.length === 0 && dayNotes.length === 0 && (
                        <div className="mt-1 text-gray-300">No activity</div>
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
                <div className="w-8 h-8 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-center shadow-sm gap-0.5">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                  <div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div>
                </div>
                <div>
                  <span className="text-sm font-semibold text-gray-900">Employee Work</span>
                  <p className="text-xs text-gray-600">Colored dots per employee</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-center shadow-sm">
                  <div className="w-2 h-2 bg-green-500 rounded-full border border-white"></div>
                </div>
                <div>
                  <span className="text-sm font-semibold text-gray-900">Payments</span>
                  <p className="text-xs text-gray-600">Green dot</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-center shadow-sm">
                  <div className="w-1.5 h-1.5 bg-gray-500 rounded-full"></div>
                </div>
                <div>
                  <span className="text-sm font-semibold text-gray-900">Day Notes</span>
                  <p className="text-xs text-gray-600">Grey dot</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-100 border-2 border-blue-300 rounded-xl relative shadow-sm">
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-white"></div>
                </div>
                <div>
                  <span className="text-sm font-semibold text-gray-900">Today</span>
                  <p className="text-xs text-gray-600">Blue border with corner dot</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-center shadow-sm">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full opacity-60"></div>
                </div>
                <div>
                  <span className="text-sm font-semibold text-gray-900">Scheduled</span>
                  <p className="text-xs text-gray-600">Dimmed dots for future work</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-center shadow-sm">
                  <span className="text-xs text-gray-400">15</span>
                </div>
                <div>
                  <span className="text-sm font-semibold text-gray-900">No Activity</span>
                  <p className="text-xs text-gray-600">Just the day number</p>
                </div>
              </div>
            </div>
          </div>
        </div>



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