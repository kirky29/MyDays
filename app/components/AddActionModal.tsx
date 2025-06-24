'use client'

import { useState } from 'react'
import { format, parseISO, isToday, isPast, isFuture } from 'date-fns'
import { firebaseService } from '../../lib/firebase'

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
}

export default function AddActionModal({
  isOpen,
  onClose,
  date,
  employees,
  onComplete
}: AddActionModalProps) {
  const [step, setStep] = useState<'action' | 'employee' | 'details'>('action')
  const [selectedAction, setSelectedAction] = useState<'work' | 'schedule' | 'payment' | null>(null)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [workDetails, setWorkDetails] = useState({
    notes: '',
    customAmount: '',
    useCustomAmount: false,
    paid: false
  })
  const [isProcessing, setIsProcessing] = useState(false)

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
    payment: isDatePast || isDateToday // Can make payments for past/present
  }

  const handleClose = () => {
    resetModal()
    onClose()
  }

  const handleActionSelect = (action: 'work' | 'schedule' | 'payment') => {
    setSelectedAction(action)
    setStep('employee')
  }

  const handleEmployeeSelect = (employee: Employee) => {
    setSelectedEmployee(employee)
    if (selectedAction === 'payment') {
      // For payments, we might want to show a different flow
      handleComplete()
    } else {
      setStep('details')
    }
  }

  const handleComplete = async () => {
    if (!selectedEmployee || !selectedAction) return

    setIsProcessing(true)
    
    try {
      if (selectedAction === 'work' || selectedAction === 'schedule') {
        const workDay: WorkDay = {
          id: `${selectedEmployee.id}-${date}`,
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
      console.error('Error adding work day:', error)
      alert(`Failed to add work day: ${error.message}`)
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

              {availableActions.payment && (
                <button
                  onClick={() => handleActionSelect('payment')}
                  className="w-full p-4 border border-gray-200 rounded-lg hover:bg-green-50 hover:border-green-300 transition-all text-left"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Make Payment</h3>
                      <p className="text-sm text-gray-600">
                        {isDatePast && 'Pay for work that was completed'}
                        {isDateToday && 'Pay for work completed today'}
                      </p>
                    </div>
                  </div>
                </button>
              )}

              {/* No actions available message */}
              {!availableActions.work && !availableActions.schedule && !availableActions.payment && (
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

          {step === 'employee' && (
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
              
              {employees.map(employee => (
                <button
                  key={employee.id}
                  onClick={() => handleEmployeeSelect(employee)}
                  className="w-full p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all text-left"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gray-400 text-white rounded-full flex items-center justify-center">
                      <span className="font-bold text-sm">{employee.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{employee.name}</h3>
                      <p className="text-sm text-gray-600">£{employee.dailyWage}/day</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {step === 'details' && selectedEmployee && (
            <div className="space-y-4">
              <div className="mb-4">
                <button
                  onClick={() => setStep('employee')}
                  className="flex items-center text-sm text-gray-600 hover:text-gray-800"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back to employees
                </button>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <h3 className="font-semibold text-gray-800">
                  {selectedAction === 'work' ? 'Log Work' : 'Schedule Work'} for {selectedEmployee.name}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {format(parseISO(date), 'EEEE, MMMM d, yyyy')}
                </p>
              </div>

              {/* Notes */}
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

              {/* Custom Amount */}
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

              {workDetails.useCustomAmount && (
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>
              )}

              {/* Payment Status - Only for completed work, not scheduled work */}
              {selectedAction === 'work' && (
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
                   'Add Work Day'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 