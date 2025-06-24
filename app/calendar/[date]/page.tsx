'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { format, parseISO, isValid } from 'date-fns'
import { useFirebaseData } from '../../../lib/hooks/useFirebaseData'
import { useAppStore } from '../../../lib/store'
import type { Employee, WorkDay } from '../../../lib/store'
import BottomNavigation from '../../components/BottomNavigation'
import LoadingScreen from '../../components/LoadingScreen'
import WorkDayEditModal from '../../components/WorkDayEditModal'
import { firebaseService } from '../../../lib/firebase'

interface DayEmployee {
  employee: Employee
  workDay?: WorkDay & { notes?: string; customAmount?: number }
}

export default function DayViewPage() {
  const router = useRouter()
  const params = useParams()
  const dateParam = params.date as string
  
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([])
  const [showBulkActions, setShowBulkActions] = useState(false)
  const [showWorkDayEditModal, setShowWorkDayEditModal] = useState(false)
  const [selectedWorkDay, setSelectedWorkDay] = useState<WorkDay | null>(null)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)

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

  const handleWorkDayClick = (employee: Employee, workDay: WorkDay) => {
    setSelectedEmployee(employee)
    setSelectedWorkDay(workDay)
    setShowWorkDayEditModal(true)
  }

  const createAndEditWorkDay = async (employee: Employee) => {
    try {
      // Create a new work day
      const newWorkDay: WorkDay = {
        id: `${employee.id}-${dateString}`,
        employeeId: employee.id,
        date: dateString,
        worked: true,
        paid: false
      }
      
      await firebaseService.addWorkDay(newWorkDay)
      
      // Open the edit modal
      setSelectedEmployee(employee)
      setSelectedWorkDay(newWorkDay)
      setShowWorkDayEditModal(true)
    } catch (error: any) {
      console.error('Error creating work day:', error)
      alert(`Failed to create work day: ${error.message}`)
    }
  }

  const handleWorkDayUpdated = async (updatedWorkDay: WorkDay) => {
    try {
      await firebaseService.addWorkDay(updatedWorkDay)
      setShowWorkDayEditModal(false)
      setSelectedWorkDay(null)
      setSelectedEmployee(null)
    } catch (error: any) {
      console.error('Error updating work day:', error)
    }
  }

  const handleWorkDayRemoved = async (workDay: WorkDay) => {
    if (workDay.paid) {
      alert('Cannot remove a work day that has been paid. Please adjust the payment record first.')
      return
    }

    const confirmMessage = `Are you sure you want to remove this work day?\n\n${format(parseISO(workDay.date), 'EEEE, MMMM d, yyyy')}\n\nThis will remove the work day from records.`
    
    if (confirm(confirmMessage)) {
      try {
        console.log('Removing work day:', workDay)
        
        // Mark as not worked and clear custom data to effectively "remove" it
        const removedWorkDay: WorkDay = {
          id: workDay.id,
          employeeId: workDay.employeeId,
          date: workDay.date,
          worked: false,
          paid: false
          // Intentionally omit customAmount and notes to remove them
        }
        
        console.log('Updated work day:', removedWorkDay)
        await firebaseService.addWorkDay(removedWorkDay)
        
        console.log('Work day removed successfully')
        setShowWorkDayEditModal(false)
        setSelectedWorkDay(null)
        setSelectedEmployee(null)
        
        // Show success message
        alert('Work day removed successfully!')
      } catch (error: any) {
        console.error('Error removing work day:', error)
        alert(`Failed to remove work day: ${error.message}`)
      }
    }
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

        {/* Quick Info - Show when no work activities */}
        {dayEmployees.length > 0 && workedEmployees.length === 0 && (
          <div className="card mb-6 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="card-body text-center py-4">
              <div className="inline-flex items-center justify-center w-10 h-10 bg-blue-100 rounded-xl mb-3">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-gray-900 mb-1">No Work Recorded Yet</h3>
              <p className="text-xs text-gray-600">Use checkboxes below to select who worked today</p>
            </div>
          </div>
        )}

        {/* Day Progress Overview - Show when there are activities */}
        {workedEmployees.length > 0 && (
          <div className="card mb-6">
            <div className="card-body">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-gray-900">Day Progress</h3>
                  <p className="text-sm text-gray-600">
                    {workedEmployees.length} of {dayEmployees.length} employees working
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-600">
                    {paidEmployees.length === workedEmployees.length ? (
                      <span className="text-green-600 font-semibold">✓ All Paid</span>
                    ) : (
                      <span className="text-amber-600 font-semibold">{workedEmployees.length - paidEmployees.length} Unpaid</span>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span>Working Progress</span>
                  <span>{Math.round((workedEmployees.length / dayEmployees.length) * 100)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${(workedEmployees.length / dayEmployees.length) * 100}%` }}
                  ></div>
                </div>
              </div>

              {/* Quick Actions - Only show if incomplete */}
              {(workedEmployees.length < dayEmployees.length || paidEmployees.length < workedEmployees.length) && (
                <div className="flex gap-2">
                  {workedEmployees.length < dayEmployees.length && (
                    <button
                      onClick={() => {
                        dayEmployees.forEach(({ employee, workDay }) => {
                          if (!workDay?.worked) {
                            toggleWorkDay(employee.id, dateString)
                          }
                        })
                      }}
                      className="btn btn-primary btn-sm flex-1"
                    >
                      Complete All ({dayEmployees.length - workedEmployees.length} remaining)
                    </button>
                  )}
                  {paidEmployees.length < workedEmployees.length && (
                    <button
                      onClick={async () => {
                        try {
                          for (const { employee, workDay } of dayEmployees) {
                            if (workDay?.worked && !workDay?.paid) {
                              await togglePayment(employee.id, dateString)
                            }
                          }
                        } catch (error) {
                          console.error('Error marking worked as paid:', error)
                        }
                      }}
                      className="btn btn-success btn-sm flex-1"
                    >
                      Pay All ({workedEmployees.length - paidEmployees.length})
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Employee List - Always show all employees */}
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
          <>
            {/* Employee Section Header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Team Members</h3>
                <p className="text-sm text-gray-600">
                  {workedEmployees.length} of {dayEmployees.length} working
                  {selectedEmployees.length > 0 && ` • ${selectedEmployees.length} selected`}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    if (selectedEmployees.length === dayEmployees.length) {
                      setSelectedEmployees([])
                    } else {
                      setSelectedEmployees(dayEmployees.map(de => de.employee.id))
                    }
                  }}
                  className="text-sm bg-gray-100 text-gray-700 px-3 py-1 rounded-md hover:bg-gray-200 transition-colors"
                >
                  {selectedEmployees.length === dayEmployees.length ? 'None' : 'All'}
                </button>
                <button
                  onClick={() => setShowBulkActions(!showBulkActions)}
                  className={`text-sm px-3 py-1 rounded-md transition-colors ${
                    showBulkActions 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                  }`}
                >
                  Actions
                </button>
              </div>
            </div>
            
            {/* Enhanced Bulk Actions */}
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
            
            {/* All Employees List */}
            <div className="space-y-3">
            {dayEmployees.map(({ employee, workDay }) => {
              const isWorked = workDay?.worked || false
              const isPaid = workDay?.paid || false
              const isSelected = selectedEmployees.includes(employee.id)
              
              return (
                <div key={employee.id} className={`card transition-all ${
                  isWorked 
                    ? isPaid 
                      ? 'border-l-4 border-l-green-500 bg-green-50/50' 
                      : 'border-l-4 border-l-amber-500 bg-amber-50/50'
                    : 'border-l-4 border-l-gray-300 bg-white'
                } ${isSelected ? 'ring-2 ring-blue-500' : ''}`}>
                  <div className="card-body py-4">
                    {/* Employee Header with Work Status Toggle */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 flex-1">
                        {/* Work Status Checkbox */}
                        <div className="relative">
                          <input
                            type="checkbox"
                            checked={isWorked}
                            onChange={() => toggleWorkDay(employee.id, dateString)}
                            className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                            title={isWorked ? 'Remove from work day' : 'Add to work day'}
                          />
                          {isPaid && (
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full flex items-center justify-center">
                              <svg className="w-2 h-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          )}
                        </div>
                        
                        {/* Selection Checkbox (when bulk actions enabled) */}
                        {showBulkActions && (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleEmployeeSelection(employee.id)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                        )}
                        
                                                 {/* Employee Info - Clickable for details */}
                         <div 
                           className="flex items-center space-x-3 flex-1 cursor-pointer hover:bg-gray-50 rounded-lg p-2 -m-2 transition-colors"
                           onClick={() => {
                             if (isWorked && workDay) {
                               handleWorkDayClick(employee, workDay)
                             } else {
                               // Auto-create work day when clicking on non-working employee
                               createAndEditWorkDay(employee)
                             }
                           }}
                         >
                          <div className={`avatar avatar-md ${
                            isWorked 
                              ? isPaid ? 'bg-green-500 text-white' : 'bg-amber-500 text-white'
                              : 'bg-gray-400 text-white'
                          }`}>
                            <span className="font-bold">{employee.name.charAt(0).toUpperCase()}</span>
                          </div>
                          <div className="flex-1">
                            <h3 className="font-bold text-gray-900">{employee.name}</h3>
                            <div className="flex items-center space-x-2">
                              <p className="text-sm text-gray-600">£{employee.dailyWage}/day</p>
                              {workDay?.notes && (
                                <svg className="w-3 h-3 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                                </svg>
                              )}
                              {workDay?.customAmount !== undefined && (
                                <span className="text-xs bg-blue-100 text-blue-800 px-1 rounded">Custom</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Quick Actions */}
                      <div className="flex items-center space-x-2">
                        {/* Add Details Button - Show for non-working employees */}
                        {!isWorked && (
                          <button
                            onClick={() => createAndEditWorkDay(employee)}
                            className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
                            title="Add work details"
                          >
                            Add Details
                          </button>
                        )}
                        
                        {/* Payment Toggle - Only show if worked */}
                        {isWorked && (
                          <button
                            onClick={() => togglePayment(employee.id, dateString)}
                            className={`p-2 rounded-lg transition-all ${
                              isPaid
                                ? 'bg-green-600 text-white hover:bg-green-700'
                                : 'bg-amber-500 text-white hover:bg-amber-600'
                            }`}
                            title={isPaid ? 'Mark as unpaid' : 'Mark as paid'}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                            </svg>
                          </button>
                        )}

                        {/* Profile Link */}
                        <button
                          onClick={() => router.push(`/employee/${employee.id}`)}
                          className="p-2 text-gray-400 hover:text-blue-600 rounded-lg transition-colors"
                          title="View employee profile"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Status Info */}
                    {isWorked && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="flex items-center justify-between text-sm">
                          <span className={`font-medium ${isPaid ? 'text-green-700' : 'text-amber-700'}`}>
                            {isPaid ? '✓ Paid' : '⏳ Payment Pending'}
                          </span>
                          <span className="font-semibold text-gray-900">£{employee.dailyWage}</span>
                        </div>
                      </div>
                    )}
                    
                    {/* Help Text for Non-Working Employees */}
                    {!isWorked && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <p className="text-xs text-gray-500">
                          ☐ Not working today • Click checkbox to mark as worked, or "Add Details" for notes & custom amounts
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
            </div>
          </>
        )}
      </div>

      {/* Work Day Edit Modal */}
      {selectedWorkDay && selectedEmployee && (
        <WorkDayEditModal
          isOpen={showWorkDayEditModal}
          onClose={() => {
            setShowWorkDayEditModal(false)
            setSelectedWorkDay(null)
            setSelectedEmployee(null)
          }}
          workDay={selectedWorkDay}
          employee={selectedEmployee}
          onWorkDayUpdated={handleWorkDayUpdated}
          onWorkDayRemoved={handleWorkDayRemoved}
        />
      )}

      {/* Bottom Navigation */}
      <BottomNavigation onNavigate={handleNavigate} />
    </div>
  )
} 