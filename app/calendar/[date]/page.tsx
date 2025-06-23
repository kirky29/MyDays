'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { format, parseISO, isValid } from 'date-fns'
import { useFirebaseData } from '../../../lib/hooks/useFirebaseData'
import { useAppStore } from '../../../lib/store'
import type { Employee, WorkDay } from '../../../lib/store'
import BottomNavigation from '../../components/BottomNavigation'
import LoadingScreen from '../../components/LoadingScreen'

interface DayEmployee {
  employee: Employee
  workDay?: WorkDay
}

export default function DayViewPage() {
  const router = useRouter()
  const params = useParams()
  const dateParam = params.date as string
  
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([])
  const [showBulkActions, setShowBulkActions] = useState(false)

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

  // Validate and parse the date
  const date = parseISO(dateParam)
  const isValidDate = isValid(date)

  useEffect(() => {
    if (!isValidDate) {
      router.push('/calendar')
    }
  }, [isValidDate, router])

  const handleNavigate = (path: string) => {
    router.push(path)
  }

  const getWorkDaysForDate = (dateString: string) => {
    return workDays.filter(day => day.date === dateString && day.worked)
  }

  const getDayEmployees = (): DayEmployee[] => {
    const dateString = format(date, 'yyyy-MM-dd')
    const dayWorkDays = getWorkDaysForDate(dateString)
    
    return employees.map(employee => ({
      employee,
      workDay: dayWorkDays.find(wd => wd.employeeId === employee.id)
    }))
  }

  const handleBulkAction = async (action: 'markWorked' | 'markPaid' | 'markUnworked') => {
    const dateString = format(date, 'yyyy-MM-dd')
    
    try {
      for (const employeeId of selectedEmployees) {
        if (action === 'markWorked') {
          await toggleWorkDay(employeeId, dateString)
        } else if (action === 'markPaid') {
          await togglePayment(employeeId, dateString)
        } else if (action === 'markUnworked') {
          // Remove work day by toggling if currently worked
          const employee = employees.find(e => e.id === employeeId)
          const dayEmployees = getDayEmployees()
          const dayEmployee = dayEmployees.find(de => de.employee.id === employeeId)
          
          if (dayEmployee?.workDay?.worked) {
            await toggleWorkDay(employeeId, dateString)
          }
        }
      }
      setSelectedEmployees([])
      setShowBulkActions(false)
    } catch (error) {
      console.error('Bulk action failed:', error)
    }
  }

  const toggleEmployeeSelection = (employeeId: string) => {
    setSelectedEmployees(prev => 
      prev.includes(employeeId) 
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    )
  }

  if (loading) {
    return <LoadingScreen />
  }

  if (!isValidDate) {
    return null // Will redirect in useEffect
  }

  const dayEmployees = getDayEmployees()
  const dateString = format(date, 'yyyy-MM-dd')
  const workedEmployees = dayEmployees.filter(({ workDay }) => workDay?.worked)
  const paidEmployees = workedEmployees.filter(({ workDay }) => workDay?.paid)
  const totalEarned = workedEmployees.reduce((sum, { employee }) => sum + employee.dailyWage, 0)
  const totalPaid = paidEmployees.reduce((sum, { employee }) => sum + employee.dailyWage, 0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 pb-20 sm:pb-24">
      <div className="container mx-auto px-4 py-4 sm:py-6 max-w-md">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => router.push('/calendar')}
              className="p-3 hover:bg-white/80 rounded-xl transition-colors border border-gray-200 shadow-sm"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            <div className="text-center">
              <h1 className="text-xl font-bold text-gray-900">
                {format(date, 'EEEE, MMMM d')}
              </h1>
              <p className="text-sm text-blue-600">Work Day Management</p>
            </div>

            <button
              onClick={() => setShowBulkActions(!showBulkActions)}
              className={`p-3 rounded-xl transition-colors border shadow-sm ${
                showBulkActions 
                  ? 'bg-blue-600 text-white border-blue-600' 
                  : 'hover:bg-white/80 border-gray-200 text-gray-600'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>
          </div>

          {/* Quick Summary Stats */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="card">
              <div className="card-body text-center py-3">
                <div className="text-2xl font-bold text-gray-900">{workedEmployees.length}</div>
                <div className="text-xs text-gray-600">Working</div>
              </div>
            </div>
            <div className="card">
              <div className="card-body text-center py-3">
                <div className="text-2xl font-bold text-green-600">£{totalPaid}</div>
                <div className="text-xs text-gray-600">Paid</div>
              </div>
            </div>
            <div className="card">
              <div className="card-body text-center py-3">
                <div className="text-2xl font-bold text-amber-600">£{totalEarned - totalPaid}</div>
                <div className="text-xs text-gray-600">Outstanding</div>
              </div>
            </div>
          </div>

          {/* Bulk Actions */}
          {showBulkActions && selectedEmployees.length > 0 && (
            <div className="card mb-4 border-blue-200 bg-blue-50">
              <div className="card-body">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-blue-900">
                    {selectedEmployees.length} employee{selectedEmployees.length !== 1 ? 's' : ''} selected
                  </span>
                  <button
                    onClick={() => setSelectedEmployees([])}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    Clear
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => handleBulkAction('markWorked')}
                    className="btn btn-primary btn-sm"
                  >
                    Mark Worked
                  </button>
                  <button
                    onClick={() => handleBulkAction('markPaid')}
                    className="btn btn-success btn-sm"
                  >
                    Mark Paid
                  </button>
                  <button
                    onClick={() => handleBulkAction('markUnworked')}
                    className="btn btn-secondary btn-sm"
                  >
                    Remove Work
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Quick Add Section - Show when no work activities */}
        {dayEmployees.length > 0 && workedEmployees.length === 0 && (
          <div className="card mb-6 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="card-body text-center">
              <div className="mb-4">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-xl mb-3">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Add New Work Day</h3>
                <p className="text-gray-600 text-sm">No work activities recorded for this day yet</p>
              </div>
              
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      // Mark all employees as worked
                      dayEmployees.forEach(({ employee }) => {
                        toggleWorkDay(employee.id, dateString)
                      })
                    }}
                    className="btn btn-primary btn-sm"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    All Worked
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        // Mark all as worked first
                        for (const { employee } of dayEmployees) {
                          await toggleWorkDay(employee.id, dateString)
                        }
                        // Wait a moment for work days to be created, then mark as paid
                        setTimeout(async () => {
                          for (const { employee } of dayEmployees) {
                            await togglePayment(employee.id, dateString)
                          }
                        }, 200)
                      } catch (error) {
                        console.error('Error marking all as paid:', error)
                      }
                    }}
                    className="btn btn-success btn-sm"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                    All Paid
                  </button>
                </div>
                <p className="text-xs text-gray-500">Or select individual employees below</p>
              </div>
            </div>
          </div>
        )}

        {/* Quick Complete Section - Show when some but not all employees worked */}
        {dayEmployees.length > 0 && workedEmployees.length > 0 && workedEmployees.length < dayEmployees.length && (
          <div className="card mb-6 border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50">
            <div className="card-body">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="inline-flex items-center justify-center w-10 h-10 bg-amber-100 rounded-xl">
                    <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Quick Complete</h4>
                    <p className="text-sm text-gray-600">{dayEmployees.length - workedEmployees.length} employee{dayEmployees.length - workedEmployees.length !== 1 ? 's' : ''} haven't worked yet</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-amber-700">{workedEmployees.length}/{dayEmployees.length}</div>
                  <div className="text-xs text-gray-600">Working</div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    // Mark remaining employees as worked
                    dayEmployees.forEach(({ employee, workDay }) => {
                      if (!workDay?.worked) {
                        toggleWorkDay(employee.id, dateString)
                      }
                    })
                  }}
                  className="btn btn-primary btn-sm"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Mark All Worked
                </button>
                <button
                  onClick={async () => {
                    try {
                      // Mark all worked employees as paid
                      for (const { employee, workDay } of dayEmployees) {
                        if (workDay?.worked && !workDay?.paid) {
                          await togglePayment(employee.id, dateString)
                        }
                      }
                    } catch (error) {
                      console.error('Error marking worked as paid:', error)
                    }
                  }}
                  className="btn btn-success btn-sm"
                  disabled={paidEmployees.length === workedEmployees.length}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                  Pay Worked ({workedEmployees.length - paidEmployees.length})
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Employee List */}
        {dayEmployees.length === 0 ? (
          <div className="card">
            <div className="card-body text-center py-12">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 0 5.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No employees found</h3>
              <p className="text-gray-600 mb-4">Add employees to start tracking work days</p>
              <button
                onClick={() => router.push('/add-employee')}
                className="btn btn-primary"
              >
                Add First Employee
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {dayEmployees.map(({ employee, workDay }) => {
              const isWorked = workDay?.worked || false
              const isPaid = workDay?.paid || false
              const isSelected = selectedEmployees.includes(employee.id)
              
              return (
                <div key={employee.id} className={`card border-2 transition-all ${
                  isWorked 
                    ? isPaid 
                      ? 'border-green-200 bg-green-50' 
                      : 'border-amber-200 bg-amber-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                } ${isSelected ? 'ring-2 ring-blue-500' : ''}`}>
                  <div className="card-body">
                    {/* Employee Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        {showBulkActions && (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleEmployeeSelection(employee.id)}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                          />
                        )}
                        <div className={`avatar avatar-lg ${
                          isWorked 
                            ? isPaid ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          <span className="font-bold text-lg">{employee.name.charAt(0).toUpperCase()}</span>
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900 text-lg">{employee.name}</h3>
                          <p className="text-gray-600">Daily rate: £{employee.dailyWage}</p>
                        </div>
                      </div>
                      
                      {/* Status Badge */}
                      <div className={`px-4 py-2 rounded-full text-sm font-bold border-2 ${
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
                    <div className="grid grid-cols-1 gap-3">
                      {/* Work Status Button */}
                      <button
                        onClick={() => toggleWorkDay(employee.id, dateString)}
                        className={`p-4 rounded-xl font-semibold transition-all ${
                          isWorked
                            ? 'bg-blue-600 text-white hover:bg-blue-700 border-2 border-blue-600'
                            : 'bg-white text-gray-700 hover:bg-gray-50 border-2 border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        {isWorked 
                          ? (
                            <div className="flex items-center justify-center space-x-2">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              <span>Worked Today (Click to Remove)</span>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center space-x-2">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                              </svg>
                              <span>Mark as Worked</span>
                            </div>
                          )
                        }
                      </button>
                      
                      {/* Payment Button - Only show if worked */}
                      {isWorked && (
                        <button
                          onClick={() => togglePayment(employee.id, dateString)}
                          className={`p-4 rounded-xl font-semibold transition-all ${
                            isPaid
                              ? 'bg-green-600 text-white hover:bg-green-700 border-2 border-green-600'
                              : 'bg-amber-500 text-white hover:bg-amber-600 border-2 border-amber-500'
                          }`}
                        >
                          {isPaid ? (
                            <div className="flex items-center justify-center space-x-2">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                              </svg>
                              <span>Paid £{employee.dailyWage} (Click to Undo)</span>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center space-x-2">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                              </svg>
                              <span>Mark Paid £{employee.dailyWage}</span>
                            </div>
                          )}
                        </button>
                      )}

                      {/* Secondary Actions */}
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-200">
                        <button
                          onClick={() => router.push(`/employee/${employee.id}`)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg text-sm font-medium transition-colors"
                        >
                          View Profile →
                        </button>
                        <button
                          onClick={() => {
                            // Add quick note functionality here if needed
                            console.log('Quick note for', employee.name)
                          }}
                          className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg text-sm font-medium transition-colors"
                        >
                          Add Note
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation onNavigate={handleNavigate} />
    </div>
  )
} 