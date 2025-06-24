'use client'

import { useState, useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import { useBodyScrollLock } from '../../lib/hooks/useBodyScrollLock'
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

interface Payment {
  id: string
  employeeId: string
  workDayIds: string[]
  amount: number
  paymentType: string
  notes?: string
  date: string
  createdAt: string
}

interface WorkDayEditModalProps {
  isOpen: boolean
  onClose: () => void
  workDay: WorkDay
  employee: Employee
  onWorkDayUpdated: (workDay: WorkDay) => void
  onWorkDayRemoved: (workDay: WorkDay) => void
  payments?: Payment[] // Optional payments for validation
}

export default function WorkDayEditModal({
  isOpen,
  onClose,
  workDay,
  employee,
  onWorkDayUpdated,
  onWorkDayRemoved,
  payments = []
}: WorkDayEditModalProps) {
  const [formData, setFormData] = useState<WorkDay>(workDay)
  const [useCustomAmount, setUseCustomAmount] = useState(workDay.customAmount !== undefined)
  const [showPaymentConfirmation, setShowPaymentConfirmation] = useState(false)
  const [paymentAction, setPaymentAction] = useState<'mark-paid' | 'unmark-paid' | null>(null)
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)
  const [paymentError, setPaymentError] = useState<string>('')
  
  // Prevent background scrolling when modal is open
  useBodyScrollLock(isOpen)

  useEffect(() => {
    setFormData(workDay)
    setUseCustomAmount(workDay.customAmount !== undefined)
    setPaymentError('')
    setShowPaymentConfirmation(false)
    setPaymentAction(null)
  }, [workDay])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Create base work day object
    const updatedWorkDay: WorkDay = {
      id: formData.id,
      employeeId: formData.employeeId,
      date: formData.date,
      worked: formData.worked,
      paid: formData.paid // Keep current paid status - payments handled separately
    }
    
    // Only add optional fields if they have values
    if (useCustomAmount && formData.customAmount !== undefined) {
      updatedWorkDay.customAmount = formData.customAmount
    }
    
    if (formData.notes && formData.notes.trim()) {
      updatedWorkDay.notes = formData.notes.trim()
    }
    
    onWorkDayUpdated(updatedWorkDay)
  }

  const getDefaultAmount = () => {
    if (employee.wageChangeDate && employee.previousWage && workDay.date < employee.wageChangeDate) {
      return employee.previousWage
    }
    return employee.dailyWage
  }

  const getWorkDayAmount = () => {
    if (useCustomAmount && formData.customAmount !== undefined) {
      return formData.customAmount
    }
    return getDefaultAmount()
  }

  // Find related payment for this work day
  const relatedPayment = payments.find(payment => 
    payment.workDayIds.includes(workDay.id)
  )

  const handleMarkAsPaid = async () => {
    if (!formData.worked) {
      setPaymentError('Cannot mark as paid - work day is not marked as worked')
      return
    }

    setPaymentAction('mark-paid')
    setShowPaymentConfirmation(true)
  }

  const handleUnmarkAsPaid = async () => {
    setPaymentAction('unmark-paid')
    setShowPaymentConfirmation(true)
  }

  const executePaymentAction = async () => {
    if (!paymentAction) return

    setIsProcessingPayment(true)
    setPaymentError('')

    try {
      if (paymentAction === 'mark-paid') {
        // Create payment and mark as paid using the robust service
        await firebaseService.createPaymentAndMarkWorkDays(
          employee.id,
          [workDay.id],
          getWorkDayAmount(),
          'Cash', // Default payment type - could be made configurable
          `Payment for work on ${format(parseISO(workDay.date), 'MMM d, yyyy')}`
        )
        setFormData(prev => ({ ...prev, paid: true }))
      } else if (paymentAction === 'unmark-paid') {
        // Use the robust unmarking service
        const result = await firebaseService.unmarkWorkDaysAsPaid([workDay.id])
        
        if (result.requiresConfirmation) {
          // Show confirmation for payment records
          if (confirm(result.confirmationMessage)) {
            await firebaseService.forceUnmarkWorkDaysAsPaid([workDay.id], 'update')
            setFormData(prev => ({ ...prev, paid: false }))
          } else {
            setShowPaymentConfirmation(false)
            setPaymentAction(null)
            return
          }
        } else {
          setFormData(prev => ({ ...prev, paid: false }))
        }
      }
      
      setShowPaymentConfirmation(false)
      setPaymentAction(null)
    } catch (error: any) {
      console.error('Error processing payment action:', error)
      setPaymentError(error.message || 'Failed to process payment action')
    } finally {
      setIsProcessingPayment(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 pt-8 border-b">
          <h2 className="text-xl font-semibold text-gray-800">
            Edit Work Day
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {!showPaymentConfirmation ? (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Date Display */}
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <div className="font-semibold text-gray-800">
                {format(parseISO(workDay.date), 'EEEE, MMMM d, yyyy')}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                {format(parseISO(workDay.date), 'MMM d, yyyy')}
              </div>
            </div>

            {/* Custom Amount Toggle */}
            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={useCustomAmount}
                  onChange={(e) => {
                    setUseCustomAmount(e.target.checked)
                    if (!e.target.checked) {
                      setFormData(prev => ({ ...prev, customAmount: undefined }))
                    } else {
                      setFormData(prev => ({ ...prev, customAmount: getDefaultAmount() }))
                    }
                  }}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Use custom amount for this day
                </span>
              </label>
              
              {!useCustomAmount && (
                <div className="mt-2 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                  <div className="flex justify-between">
                    <span>Standard rate:</span>
                    <span className="font-medium">£{getDefaultAmount()}/day</span>
                  </div>
                </div>
              )}
            </div>

            {useCustomAmount && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Custom Amount (£)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.customAmount ?? ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    customAmount: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
                <div className="mt-1 text-xs text-gray-500">
                  Set to £0.00 for work done for free
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes (Optional)
              </label>
              <textarea
                value={formData.notes || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value || undefined }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Add notes about this work day (e.g., half day, overtime, special project...)"
              />
            </div>

            {/* Payment Status Section */}
            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Payment Status</h3>
              
              {/* Current Status Display */}
              <div className={`rounded-lg p-4 mb-3 ${
                formData.paid 
                  ? 'bg-green-50 border border-green-200' 
                  : 'bg-orange-50 border border-orange-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${
                      formData.paid ? 'bg-green-500' : 'bg-orange-500'
                    }`}></div>
                    <span className={`font-medium ${
                      formData.paid ? 'text-green-800' : 'text-orange-800'
                    }`}>
                      {formData.paid ? 'Paid' : 'Unpaid'}
                    </span>
                  </div>
                  <span className={`text-lg font-bold ${
                    formData.paid ? 'text-green-600' : 'text-orange-600'
                  }`}>
                    £{getWorkDayAmount().toFixed(2)}
                  </span>
                </div>

                {/* Payment Record Info */}
                {formData.paid && relatedPayment && (
                  <div className="mt-2 text-xs text-green-700">
                    <div>Payment Record: {relatedPayment.paymentType}</div>
                    <div>Paid on: {format(parseISO(relatedPayment.date), 'MMM d, yyyy')}</div>
                    {relatedPayment.notes && (
                      <div>Notes: {relatedPayment.notes}</div>
                    )}
                  </div>
                )}

                {/* Warning for paid work day without payment record */}
                {formData.paid && !relatedPayment && (
                  <div className="mt-2 text-xs text-red-600 flex items-center space-x-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <span>Warning: Marked as paid but no payment record found</span>
                  </div>
                )}
              </div>

              {/* Payment Action Buttons */}
              <div className="space-y-2">
                {!formData.paid ? (
                  <button
                    type="button"
                    onClick={handleMarkAsPaid}
                    disabled={!formData.worked}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    {!formData.worked ? 'Cannot Pay (Not Worked)' : 'Mark as Paid'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleUnmarkAsPaid}
                    className="w-full px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
                  >
                    Unmark as Paid
                  </button>
                )}
              </div>

              {/* Payment Error */}
              {paymentError && (
                <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <svg className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-red-800">Payment Error</p>
                      <p className="text-sm text-red-700 mt-1">{paymentError}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col space-y-3 pt-4">
              {/* Remove Day Button */}
              <button
                type="button"
                onClick={() => onWorkDayRemoved(workDay)}
                disabled={workDay.paid}
                className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {workDay.paid ? 'Cannot Remove (Already Paid)' : 'Remove Work Day'}
              </button>
              
              {/* Action Buttons */}
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </form>
        ) : (
          /* Payment Confirmation Dialog */
          <div className="p-6">
            <div className="text-center mb-6">
              <div className="w-12 h-12 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {paymentAction === 'mark-paid' ? 'Confirm Payment' : 'Confirm Unpayment'}
              </h3>
              <p className="text-gray-600">
                {paymentAction === 'mark-paid' 
                  ? `Mark this work day as paid for £${getWorkDayAmount().toFixed(2)}?`
                  : 'Unmark this work day as paid?'
                }
              </p>
              
              {paymentAction === 'mark-paid' && (
                <div className="mt-3 p-3 bg-green-50 rounded-lg">
                  <div className="text-sm text-green-800">
                    <div>Employee: {employee.name}</div>
                    <div>Date: {format(parseISO(workDay.date), 'EEEE, MMM d, yyyy')}</div>
                    <div>Amount: £{getWorkDayAmount().toFixed(2)}</div>
                  </div>
                </div>
              )}

              {paymentAction === 'unmark-paid' && relatedPayment && (
                <div className="mt-3 p-3 bg-orange-50 rounded-lg">
                  <div className="text-sm text-orange-800">
                    <div>This will affect the payment record:</div>
                    <div>£{relatedPayment.amount.toFixed(2)} paid on {format(parseISO(relatedPayment.date), 'MMM d, yyyy')}</div>
                    <div className="mt-1 text-xs">The payment record will be updated automatically</div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowPaymentConfirmation(false)
                  setPaymentAction(null)
                  setPaymentError('')
                }}
                disabled={isProcessingPayment}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={executePaymentAction}
                disabled={isProcessingPayment}
                className={`flex-1 px-4 py-2 rounded-md text-white transition-colors disabled:opacity-50 ${
                  paymentAction === 'mark-paid' 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-orange-600 hover:bg-orange-700'
                }`}
              >
                {isProcessingPayment ? 'Processing...' : 
                 paymentAction === 'mark-paid' ? 'Confirm Payment' : 'Confirm Unpayment'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 