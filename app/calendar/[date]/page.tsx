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
import AddActionModal from '../../components/AddActionModal'
import { firebaseService } from '../../../lib/firebase'

interface DayEmployee {
  employee: Employee
  workDay?: WorkDay & { notes?: string; customAmount?: number }
}

export default function DayViewPage() {
  const router = useRouter()
  const params = useParams()
  const dateParam = params.date as string
  
  const [showWorkDayEditModal, setShowWorkDayEditModal] = useState(false)
  const [selectedWorkDay, setSelectedWorkDay] = useState<WorkDay | null>(null)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)

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
    // Show both completed work (worked: true) and scheduled work (worked: false)
    return workDays.filter(day => day.date === dateString)
  }

  const getDayEmployees = (): DayEmployee[] => {
    const dateString = format(date, 'yyyy-MM-dd')
    const dayWorkDays = getWorkDaysForDate(dateString)
    
    return employees.map(employee => ({
      employee,
      workDay: dayWorkDays.find(wd => wd.employeeId === employee.id)
    }))
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
  const allWorkEntries = dayEmployees.filter(({ workDay }) => workDay) // Any work entry (completed or scheduled)
  const completedWork = dayEmployees.filter(({ workDay }) => workDay?.worked === true) // Only completed work
  const scheduledWork = dayEmployees.filter(({ workDay }) => workDay?.worked === false) // Only scheduled work
  const paidEmployees = completedWork.filter(({ workDay }) => workDay?.paid)
  const totalEarned = completedWork.reduce((sum, { employee }) => sum + employee.dailyWage, 0)
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

            <div className="w-12 h-12"></div> {/* Spacer for symmetry */}
          </div>

          {/* Quick Summary Stats */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="card">
              <div className="card-body text-center py-3">
                <div className="text-2xl font-bold text-gray-900">{allWorkEntries.length}</div>
                <div className="text-xs text-gray-600">Total Entries</div>
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


        </div>

        {/* Add Button - Always visible */}
        <div className="mb-6">
          <button
            onClick={() => setShowAddModal(true)}
            className="w-full p-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-md hover:shadow-lg"
          >
            <div className="flex items-center justify-center space-x-3">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold">Add to This Day</h3>
                <p className="text-blue-100 text-sm">Log work, schedule, or make payment</p>
              </div>
            </div>
          </button>
        </div>

        {/* Day Progress Overview - Show when there are activities */}
        {allWorkEntries.length > 0 && (
          <div className="card mb-6">
            <div className="card-body">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-gray-900">Day Overview</h3>
                  <p className="text-sm text-gray-600">
                    {completedWork.length} completed, {scheduledWork.length} scheduled
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-600">
                    {completedWork.length > 0 && paidEmployees.length === completedWork.length ? (
                      <span className="text-green-600 font-semibold">✓ All Paid</span>
                    ) : completedWork.length > 0 ? (
                      <span className="text-amber-600 font-semibold">{completedWork.length - paidEmployees.length} Unpaid</span>
                    ) : (
                      <span className="text-purple-600 font-semibold">All Scheduled</span>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span>Work Progress</span>
                  <span>{Math.round((completedWork.length / allWorkEntries.length) * 100)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${allWorkEntries.length > 0 ? (completedWork.length / allWorkEntries.length) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>

              {/* Quick Actions - Only show if there are actions to take */}
              {(scheduledWork.length > 0 || (completedWork.length > 0 && paidEmployees.length < completedWork.length)) && (
                <div className="flex gap-2">
                  {scheduledWork.length > 0 && (
                    <button
                      onClick={() => {
                        scheduledWork.forEach(({ employee, workDay }) => {
                          if (workDay && !workDay.worked) {
                            // Mark scheduled work as completed
                            toggleWorkDay(employee.id, dateString)
                          }
                        })
                      }}
                      className="btn btn-primary btn-sm flex-1"
                    >
                      Complete All ({scheduledWork.length} scheduled)
                    </button>
                  )}
                  {completedWork.length > 0 && paidEmployees.length < completedWork.length && (
                    <button
                      onClick={async () => {
                        try {
                          for (const { employee, workDay } of completedWork) {
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
                      Pay All ({completedWork.length - paidEmployees.length})
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Work Entries for Today */}
        {employees.length === 0 ? (
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
        ) : allWorkEntries.length === 0 ? (
          <div className="card">
            <div className="card-body text-center py-8">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No work recorded yet</h3>
              <p className="text-gray-600 mb-4">Use the "Add" button above to log work, schedule, or make payments</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {allWorkEntries.map(({ employee, workDay }) => {
              if (!workDay) return null
              
              const isCompleted = workDay.worked === true
              const isScheduled = workDay.worked === false
              const isPaid = workDay.paid
              const hasCustomAmount = workDay.customAmount !== undefined
              const hasNotes = workDay.notes && workDay.notes.trim().length > 0
              const displayAmount = hasCustomAmount ? workDay.customAmount : employee.dailyWage
              
              return (
                <div
                  key={employee.id}
                  onClick={() => handleWorkDayClick(employee, workDay)}
                  className={`card cursor-pointer hover:shadow-md transition-all ${
                    isCompleted && isPaid 
                      ? 'border-l-4 border-l-green-500 bg-green-50/50' 
                      : isCompleted 
                        ? 'border-l-4 border-l-blue-500 bg-blue-50/50'
                        : 'border-l-4 border-l-purple-500 bg-purple-50/50'
                  }`}
                >
                  <div className="card-body py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 flex-1">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                          isCompleted && isPaid 
                            ? 'bg-green-500' 
                            : isCompleted 
                              ? 'bg-blue-500' 
                              : 'bg-purple-500'
                        }`}>
                          {employee.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-900">{employee.name}</h3>
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <span>£{displayAmount}/day</span>
                            {isScheduled && (
                              <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded">
                                Scheduled
                              </span>
                            )}
                            {hasCustomAmount && (
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                                Custom
                              </span>
                            )}
                            {hasNotes && (
                              <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded flex items-center">
                                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                                </svg>
                                Notes
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <div className="text-right">
                          <div className="text-lg font-bold text-gray-900">
                            {isScheduled ? '(Scheduled)' : `£${displayAmount}`}
                          </div>
                          <div className={`text-sm font-medium ${
                            isCompleted && isPaid 
                              ? 'text-green-600' 
                              : isCompleted 
                                ? 'text-blue-600' 
                                : 'text-purple-600'
                          }`}>
                            {isCompleted && isPaid 
                              ? '✓ Paid' 
                              : isCompleted 
                                ? 'Unpaid' 
                                : '📅 Scheduled'}
                          </div>
                        </div>
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                    
                    {hasNotes && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <p className="text-sm text-gray-600 italic">
                          "{workDay.notes}"
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Add Action Modal */}
      <AddActionModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        date={dateString}
        employees={employees}
        onComplete={() => {
          setShowAddModal(false)
          // Data will be updated via real-time listeners
        }}
      />

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
