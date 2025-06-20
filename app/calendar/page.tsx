'use client'

import { useState, useEffect } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday } from 'date-fns'
import { firebaseService } from '../../lib/firebase'
import BottomNavigation from '../components/BottomNavigation'
import PaymentModal from '../components/PaymentModal'

interface Employee {
  id: string
  name: string
  dailyWage: number
  email?: string
  phone?: string
  startDate?: string
  notes?: string
}

interface WorkDay {
  id: string
  employeeId: string
  date: string
  worked: boolean
  paid: boolean
}

interface DayViewData {
  date: string
  employees: {
    employee: Employee
    workDay?: WorkDay
  }[]
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [employees, setEmployees] = useState<Employee[]>([])
  const [workDays, setWorkDays] = useState<WorkDay[]>([])
  const [loading, setLoading] = useState(true)
  const [syncStatus, setSyncStatus] = useState<'syncing' | 'synced' | 'error'>('syncing')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [selectedDayData, setSelectedDayData] = useState<DayViewData | null>(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedEmployeeForPayment, setSelectedEmployeeForPayment] = useState<Employee | null>(null)
  const [selectedWorkDaysForPayment, setSelectedWorkDaysForPayment] = useState<WorkDay[]>([])

  // Load data from Firebase
  useEffect(() => {
    let isMounted = true

    const loadData = async () => {
      try {
        setLoading(true)
        setSyncStatus('syncing')
        setErrorMessage('')
        
        await firebaseService.enableNetwork()
        
        const [employeesData, workDaysData] = await Promise.all([
          firebaseService.getEmployees(),
          firebaseService.getWorkDays()
        ])
        
        if (isMounted) {
          setEmployees(employeesData as Employee[])
          setWorkDays(workDaysData as WorkDay[])
          setSyncStatus('synced')
        }
      } catch (error: any) {
        console.error('Error loading data:', error)
        if (isMounted) {
          setSyncStatus('error')
          setErrorMessage(error.message || 'Failed to connect to database')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadData()

    return () => {
      isMounted = false
    }
  }, [])

  // Set up real-time listeners
  useEffect(() => {
    let isMounted = true

    const unsubscribeEmployees = firebaseService.subscribeToEmployees(
      (employeesData) => {
        if (isMounted) {
          setEmployees(employeesData as Employee[])
          setSyncStatus('synced')
          setErrorMessage('')
        }
      },
      (error: any) => {
        if (isMounted) {
          console.error('Employees subscription error:', error)
          setSyncStatus('error')
          setErrorMessage(`Employees sync error: ${error.message}`)
        }
      }
    )

    const unsubscribeWorkDays = firebaseService.subscribeToWorkDays(
      (workDaysData) => {
        if (isMounted) {
          setWorkDays(workDaysData as WorkDay[])
          setSyncStatus('synced')
          setErrorMessage('')
        }
      },
      (error: any) => {
        if (isMounted) {
          console.error('Work days subscription error:', error)
          setSyncStatus('error')
          setErrorMessage(`Work days sync error: ${error.message}`)
        }
      }
    )

    return () => {
      isMounted = false
      if (unsubscribeEmployees) unsubscribeEmployees()
      if (unsubscribeWorkDays) unsubscribeWorkDays()
    }
  }, [])

  const handleNavigate = (path: string) => {
    window.location.href = path
  }

  const goToPreviousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1))
  }

  const goToNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1))
  }

  const toggleWorkDay = async (employeeId: string, date: string) => {
    const existingDay = workDays.find(day => day.employeeId === employeeId && day.date === date)
    
    try {
      setSyncStatus('syncing')
      setErrorMessage('')
      if (existingDay) {
        const updatedWorkDay = { ...existingDay, worked: !existingDay.worked }
        await firebaseService.addWorkDay(updatedWorkDay)
      } else {
        const newWorkDay: WorkDay = {
          id: Date.now().toString(),
          employeeId,
          date,
          worked: true,
          paid: false
        }
        await firebaseService.addWorkDay(newWorkDay)
      }
    } catch (error: any) {
      console.error('Error updating work day:', error)
      setSyncStatus('error')
      setErrorMessage(`Failed to update work day: ${error.message}`)
    }
  }

  const togglePayment = async (employeeId: string, date: string) => {
    const existingDay = workDays.find(day => day.employeeId === employeeId && day.date === date)
    
    if (existingDay) {
      try {
        setSyncStatus('syncing')
        setErrorMessage('')
        const updatedWorkDay = { ...existingDay, paid: !existingDay.paid }
        await firebaseService.addWorkDay(updatedWorkDay)
      } catch (error: any) {
        console.error('Error updating payment:', error)
        setSyncStatus('error')
        setErrorMessage(`Failed to update payment: ${error.message}`)
      }
    }
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

  const retryConnection = async () => {
    try {
      setSyncStatus('syncing')
      setErrorMessage('')
      await firebaseService.enableNetwork()
      
      const [employeesData, workDaysData] = await Promise.all([
        firebaseService.getEmployees(),
        firebaseService.getWorkDays()
      ])
      
      setEmployees(employeesData as Employee[])
      setWorkDays(workDaysData as WorkDay[])
      setSyncStatus('synced')
    } catch (error: any) {
      console.error('Error retrying connection:', error)
      setSyncStatus('error')
      setErrorMessage(`Connection failed: ${error.message}`)
    }
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
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 py-8 max-w-md">
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <div className="relative">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto mb-6"></div>
                <div className="absolute inset-0 rounded-full h-16 w-16 border-4 border-transparent border-t-blue-400 animate-ping mx-auto"></div>
              </div>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Loading Calendar</h2>
              <p className="text-gray-600">Preparing your work schedule...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 pb-20">
      <div className="container mx-auto px-4 py-6 max-w-md">
        {/* Sync Status Indicator */}
        <div className="mb-6 flex items-center justify-center">
          <div className={`flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium backdrop-blur-sm ${
            syncStatus === 'syncing' ? 'bg-amber-100/80 text-amber-800 border border-amber-200' :
            syncStatus === 'synced' ? 'bg-emerald-100/80 text-emerald-800 border border-emerald-200' :
            'bg-red-100/80 text-red-800 border border-red-200'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              syncStatus === 'syncing' ? 'bg-amber-500 animate-pulse' :
              syncStatus === 'synced' ? 'bg-emerald-500' :
              'bg-red-500'
            }`}></div>
            <span>
              {syncStatus === 'syncing' ? 'Syncing...' :
               syncStatus === 'synced' ? 'All Synced' :
               'Sync Error'}
            </span>
          </div>
        </div>

        {/* Error Message */}
        {errorMessage && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                  <svg className="h-5 w-5 text-red-600" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-semibold text-red-800">Connection Issue</h3>
                <p className="mt-1 text-sm text-red-700">{errorMessage}</p>
                <button
                  onClick={retryConnection}
                  className="mt-3 inline-flex items-center px-3 py-1.5 border border-red-300 text-sm font-medium rounded-lg text-red-700 bg-red-50 hover:bg-red-100 transition-colors"
                >
                  <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Retry Connection
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Work Calendar
          </h1>
          <p className="text-gray-600">
            Track daily work schedules and payments
          </p>
        </div>

        {/* Month Navigation */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex items-center justify-between">
            <button
              onClick={goToPreviousMonth}
              className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            <h2 className="text-xl font-semibold text-gray-900">
              {format(currentDate, 'MMMM yyyy')}
            </h2>
            
            <button
              onClick={goToNextMonth}
              className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
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

              return (
                <button
                  key={index}
                  onClick={() => openDayView(date)}
                  className={`
                    aspect-square p-1 rounded-lg text-xs font-medium transition-all duration-200
                    ${!isCurrentMonth ? 'text-gray-300' : 
                      isCurrentDay ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                      hasWorkers ? 
                        allPaid ? 'bg-green-100 text-green-800 hover:bg-green-200' :
                        hasUnpaid ? 'bg-orange-100 text-orange-800 hover:bg-orange-200' :
                        'text-gray-700 hover:bg-gray-100'
                      : 'text-gray-700 hover:bg-gray-100'
                    }
                  `}
                >
                  <div>{format(date, 'd')}</div>
                  {hasWorkers && (
                    <div className="flex justify-center mt-0.5">
                      <div className={`w-1 h-1 rounded-full ${
                        allPaid ? 'bg-green-500' : 'bg-orange-500'
                      }`}></div>
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Legend</h3>
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <div className="w-4 h-4 bg-green-100 border border-green-200 rounded"></div>
              <span className="text-sm text-gray-600">All workers paid</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-4 h-4 bg-orange-100 border border-orange-200 rounded"></div>
              <span className="text-sm text-gray-600">Some workers unpaid</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-4 h-4 bg-blue-100 border border-blue-200 rounded"></div>
              <span className="text-sm text-gray-600">Today</span>
            </div>
          </div>
        </div>

        {/* Day View Modal */}
        {selectedDayData && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full max-h-[80vh] overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900">
                    {format(new Date(selectedDayData.date), 'EEEE, MMM d')}
                  </h2>
                  <button
                    onClick={() => setSelectedDayData(null)}
                    className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
                  >
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <div className="p-6 max-h-96 overflow-y-auto">
                <div className="space-y-4">
                  {selectedDayData.employees.map(({ employee, workDay }) => (
                    <div
                      key={employee.id}
                      className={`p-4 rounded-xl border transition-all duration-200 ${
                        workDay?.worked
                          ? workDay.paid
                            ? 'bg-green-50 border-green-200'
                            : 'bg-orange-50 border-orange-200'
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-semibold ${
                            workDay?.worked
                              ? workDay.paid
                                ? 'bg-green-600'
                                : 'bg-orange-600'
                              : 'bg-gray-400'
                          }`}>
                            {employee.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">{employee.name}</h3>
                            <p className="text-sm text-gray-600">£{employee.dailyWage}/day</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => toggleWorkDay(employee.id, selectedDayData.date)}
                            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                              workDay?.worked
                                ? 'bg-blue-600 text-white hover:bg-blue-700'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                          >
                            {workDay?.worked ? 'Worked' : 'Not Worked'}
                          </button>
                          
                          {workDay?.worked && (
                            <>
                              <button
                                onClick={() => togglePayment(employee.id, selectedDayData.date)}
                                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                                  workDay.paid
                                    ? 'bg-green-600 text-white hover:bg-green-700'
                                    : 'bg-orange-600 text-white hover:bg-orange-700'
                                }`}
                              >
                                {workDay.paid ? 'Paid' : 'Unpaid'}
                              </button>
                              
                              {!workDay.paid && (
                                <button
                                  onClick={() => openPaymentModal(employee)}
                                  className="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors"
                                >
                                  Add Payment
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Payment Modal */}
        {showPaymentModal && selectedEmployeeForPayment && (
          <PaymentModal
            isOpen={showPaymentModal}
            employee={selectedEmployeeForPayment}
            selectedWorkDays={selectedWorkDaysForPayment}
            onClose={() => {
              setShowPaymentModal(false)
              setSelectedEmployeeForPayment(null)
              setSelectedWorkDaysForPayment([])
            }}
            onPaymentComplete={() => {
              setShowPaymentModal(false)
              setSelectedEmployeeForPayment(null)
              setSelectedWorkDaysForPayment([])
            }}
          />
        )}
      </div>

      <BottomNavigation onNavigate={handleNavigate} />
    </div>
  )
} 