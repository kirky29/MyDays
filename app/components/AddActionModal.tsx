'use client'

import { useState } from 'react'
import { format, parseISO, isToday, isPast, isFuture } from 'date-fns'
import { firebaseService } from '../../lib/firebase'
import { useBodyScrollLock } from '../../lib/hooks/useBodyScrollLock'

interface Employee {
  id: string
  name: string
  dailyWage: number
  email?: string
  phone?: string
  startDate?: string
  notes?: string
  wageChangeDate?: string
  previousWage?: number
}

interface WorkDay {
  id: string
  employeeId: string
  date: string
  worked: boolean
  paid: boolean
  customAmount?: number
  notes?: string
}

interface AddActionModalProps {
  isOpen: boolean
  onClose: () => void
  date: string
  employees: Employee[]
  onComplete: () => void
  existingWorkDays?: WorkDay[]
}

export default function AddActionModal({
  isOpen,
  onClose,
  date,
  employees,
  onComplete,
  existingWorkDays = []
}: AddActionModalProps) {
  const [step, setStep] = useState<'action' | 'employee' | 'details'>('action')
  const [selectedAction, setSelectedAction] = useState<'work' | 'schedule' | 'note' | null>(null)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [workDetails, setWorkDetails] = useState({
    notes: '',
    customAmount: '',
    useCustomAmount: false,
    paid: false
  })
  const [dayNote, setDayNote] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  
  // Prevent background scrolling when modal is open
  useBodyScrollLock(isOpen)

  const resetModal = () => {
    setStep('action')
    setSelectedAction(null)
    setSelectedEmployee(null)
    setWorkDetails({
      notes: '',
      customAmount: '',
      useCustomAmount: false,
      paid: false
    })
    setDayNote('')
    setIsProcessing(false)
  }

  // Determine which actions are available based on the date
  const dateObj = parseISO(date)
  const isDateToday = isToday(dateObj)
  const isDatePast = isPast(dateObj) && !isDateToday
  const isDateFuture = isFuture(dateObj)
  
  const availableActions = {
    work: isDatePast || isDateToday, // Can log work for past/present
    schedule: isDateFuture || isDateToday, // Can schedule for future/present  
    note: true // Can add notes to any day
  }

  const handleClose = () => {
    resetModal()
    onClose()
  }

  const handleActionSelect = (action: 'work' | 'schedule' | 'note') => {
    setSelectedAction(action)
    if (action === 'note') {
      // For notes, skip employee selection and go straight to details
      setStep('details')
    } else {
      setStep('employee')
    }
  }

  const handleEmployeeSelect = (employee: Employee) => {
    // Check if this employee already has a work day for this date
    const existingWorkDay = existingWorkDays.find(wd => 
      wd.employeeId === employee.id && wd.date === date
    )
    
    if (existingWorkDay && (selectedAction === 'work' || selectedAction === 'schedule')) {
      const existingStatus = existingWorkDay.worked ? 'worked' : 'scheduled'
      const paidStatus = existingWorkDay.paid ? ' (paid)' : ' (unpaid)'
      const message = `${employee.name} already has a work entry for ${format(parseISO(date), 'EEEE, MMMM d, yyyy')} - currently marked as ${existingStatus}${existingWorkDay.worked ? paidStatus : ''}.\n\nWould you like to update this existing entry instead?`
      
      if (confirm(message)) {
        setSelectedEmployee(employee)
        // Pre-populate the form with existing data
        setWorkDetails({
          notes: existingWorkDay.notes || '',
          customAmount: existingWorkDay.customAmount?.toString() || '',
          useCustomAmount: existingWorkDay.customAmount !== undefined,
          paid: existingWorkDay.paid
        })
        setStep('details')
      }
      return
    }
    
    setSelectedEmployee(employee)
    setStep('details')
  }

  const handleComplete = async () => {
    setIsProcessing(true)
    
    try {
      if (selectedAction === 'note') {
        // Store day note as a special work day entry
        if (dayNote.trim()) {
          const dayNoteEntry: WorkDay = {
            id: `day-note-${date}`,
            employeeId: 'day-note', // Special ID for day notes
            date,
            worked: false, // Day notes are not work
            paid: false,
            notes: dayNote.trim()
          }
          await firebaseService.addWorkDay(dayNoteEntry)
        }
      } else if (selectedAction === 'work' || selectedAction === 'schedule') {
        if (!selectedEmployee) return

        // Check if we're updating an existing work day
        const existingWorkDay = existingWorkDays.find(wd => 
          wd.employeeId === selectedEmployee.id && wd.date === date
        )

        const workDay: WorkDay = {
          id: existingWorkDay?.id || `${selectedEmployee.id}-${date}`,
          employeeId: selectedEmployee.id,
          date,
          worked: selectedAction === 'work',
          paid: workDetails.paid
        }

        // Add optional fields if they have values
        if (workDetails.notes.trim()) {
          workDay.notes = workDetails.notes.trim()
        }

        if (workDetails.useCustomAmount && workDetails.customAmount) {
          workDay.customAmount = parseFloat(workDetails.customAmount)
        }

        await firebaseService.addWorkDay(workDay)
      }
      
      onComplete()
      handleClose()
    } catch (error: any) {
      console.error('Error adding entry:', error)
      alert(`Failed to add entry: ${error.message}`)
    } finally {
      setIsProcessing(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 pt-8 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">
              Add to {format(parseISO(date), 'EEEE, MMM d')}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {step === 'action' && (
                isDatePast ? 'What would you like to record?' :
                isDateFuture ? 'What would you like to schedule?' :
                'What would you like to add?'
              )}
              {step === 'employee' && 'Select an employee'}
              {step === 'details' && 'Add details'}
            </p>
          </div>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {step === 'action' && (
            <div className="space-y-3">
              {/* Context info */}
              <div className="text-center mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">
                  {isDatePast && 'This date is in the past'}
                  {isDateToday && 'This is today'}
                  {isDateFuture && 'This date is in the future'}
                </p>
              </div>

              {availableActions.work && (
                <button
                  onClick={() => handleActionSelect('work')}
                  className="w-full p-4 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-all text-left"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Log Work Done</h3>
                      <p className="text-sm text-gray-600">
                        {isDatePast && 'Record work that was completed'}
                        {isDateToday && 'Record work completed today'}
                      </p>
                    </div>
                  </div>
                </button>
              )}

              {availableActions.schedule && (
                <button
                  onClick={() => handleActionSelect('schedule')}
                  className="w-full p-4 border border-gray-200 rounded-lg hover:bg-purple-50 hover:border-purple-300 transition-all text-left"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Schedule Work</h3>
                      <p className="text-sm text-gray-600">
                        {isDateFuture && 'Plan who will work on this day'}
                        {isDateToday && 'Schedule work for today'}
                      </p>
                    </div>
                  </div>
                </button>
              )}

              {availableActions.note && (
                <button
                  onClick={() => handleActionSelect('note')}
                  className="w-full p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all text-left"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Add Day Note</h3>
                      <p className="text-sm text-gray-600">
                        Add a general note or reminder for this day
                      </p>
                    </div>
                  </div>
                </button>
              )}

              {/* No actions available message */}
              {!availableActions.work && !availableActions.schedule && !availableActions.note && (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No actions available</h3>
                  <p className="text-gray-600">No valid actions for this date</p>
                </div>
              )}
            </div>
          )}

          {step === 'employee' && selectedAction !== 'note' && (
            <div className="space-y-3">
              <div className="mb-4">
                <button
                  onClick={() => setStep('action')}
                  className="flex items-center text-sm text-gray-600 hover:text-gray-800"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back to actions
                </button>
              </div>
              
              {employees.map(employee => {
                const existingWorkDay = existingWorkDays.find(wd => 
                  wd.employeeId === employee.id && wd.date === date
                )
                const hasExistingEntry = existingWorkDay && (selectedAction === 'work' || selectedAction === 'schedule')
                
                return (
                  <button
                    key={employee.id}
                    onClick={() => handleEmployeeSelect(employee)}
                    className={`w-full p-3 border rounded-lg transition-all text-left ${
                      hasExistingEntry 
                        ? 'border-amber-200 bg-amber-50 hover:bg-amber-100' 
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gray-400 text-white rounded-full flex items-center justify-center">
                          <span className="font-bold text-sm">{employee.name.charAt(0).toUpperCase()}</span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{employee.name}</h3>
                          <p className="text-sm text-gray-600">£{employee.dailyWage}/day</p>
                        </div>
                      </div>
                      {hasExistingEntry && (
                        <div className="flex items-center space-x-2 text-amber-600">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                          </svg>
                          <span className="text-xs font-medium">
                            {existingWorkDay.worked ? 'Already worked' : 'Already scheduled'}
                          </span>
                        </div>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {step === 'details' && (selectedEmployee || selectedAction === 'note') && (
            <div className="space-y-4">
              <div className="mb-4">
                <button
                  onClick={() => selectedAction === 'note' ? setStep('action') : setStep('employee')}
                  className="flex items-center text-sm text-gray-600 hover:text-gray-800"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  {selectedAction === 'note' ? 'Back to actions' : 'Back to employees'}
                </button>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 text-center">
                {selectedAction === 'note' ? (
                  <>
                    <h3 className="font-semibold text-gray-800">
                      Add Day Note
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {format(parseISO(date), 'EEEE, MMMM d, yyyy')}
                    </p>
                  </>
                ) : selectedEmployee ? (
                  <>
                    <h3 className="font-semibold text-gray-800">
                      {selectedAction === 'work' ? 'Log Work' : 'Schedule Work'} for {selectedEmployee.name}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {format(parseISO(date), 'EEEE, MMMM d, yyyy')}
                    </p>
                  </>
                ) : null}
              </div>

              {selectedAction === 'note' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Day Note
                  </label>
                  <textarea
                    value={dayNote}
                    onChange={(e) => setDayNote(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    placeholder="Add a note for this day (weather, conditions, reminders, etc.)"
                  />
                </div>
              ) : selectedEmployee ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes (Optional)
                    </label>
                    <textarea
                      value={workDetails.notes}
                      onChange={(e) => setWorkDetails(prev => ({ ...prev, notes: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      placeholder="Add notes about this work day..."
                    />
                  </div>

                  <div>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={workDetails.useCustomAmount}
                        onChange={(e) => setWorkDetails(prev => ({ 
                          ...prev, 
                          useCustomAmount: e.target.checked,
                          customAmount: e.target.checked ? selectedEmployee.dailyWage.toString() : ''
                        }))}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        Use custom amount
                      </span>
                    </label>
                    
                    {!workDetails.useCustomAmount && (
                      <div className="mt-2 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                        <div className="flex justify-between">
                          <span>Standard rate:</span>
                          <span className="font-medium">£{selectedEmployee.dailyWage}/day</span>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : null}

              {selectedAction !== 'note' && selectedEmployee && workDetails.useCustomAmount && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Custom Amount (£)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={workDetails.customAmount}
                    onChange={(e) => setWorkDetails(prev => ({ ...prev, customAmount: e.target.value }))}
                    onBlur={(e) => {
                      // Convert to valid number on blur, defaulting to 0 if empty
                      const value = e.target.value === '' ? '0' : e.target.value
                      setWorkDetails(prev => ({ ...prev, customAmount: value }))
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>
              )}

              {selectedAction === 'work' && selectedEmployee && (
                <div>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={workDetails.paid}
                      onChange={(e) => setWorkDetails(prev => ({ ...prev, paid: e.target.checked }))}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Mark as paid
                    </span>
                  </label>
                  <p className="text-xs text-gray-500 mt-1">
                    Only check if payment has already been made
                  </p>
                </div>
              )}

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={handleClose}
                  disabled={isProcessing}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleComplete}
                  disabled={isProcessing}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {isProcessing ? 'Adding...' : 
                   selectedAction === 'work' ? 'Log Work' :
                   selectedAction === 'schedule' ? 'Schedule Work' :
                   selectedAction === 'note' ? 'Add Day Note' :
                   'Add Entry'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 