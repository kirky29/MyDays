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

  const handleBackdropClick = (e: React.MouseEvent) => {
    // Only close if clicking directly on the backdrop, not on modal content
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const handleModalContentClick = (e: React.MouseEvent) => {
    // Prevent backdrop click when clicking inside modal
    e.stopPropagation()
  }

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50"
      onClick={handleBackdropClick}
      style={{ 
        touchAction: 'manipulation',
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none'
      }}
    >
      <div 
        className="bg-white rounded-t-lg sm:rounded-lg shadow-xl w-full sm:max-w-md sm:w-full max-h-[95vh] sm:max-h-[90vh] flex flex-col relative"
        onClick={handleModalContentClick}
        onTouchStart={() => {}} // Enable touch events on iOS
        style={{ 
          touchAction: 'manipulation',
          WebkitTapHighlightColor: 'transparent'
        }}
      >
        {/* Header - Fixed */}
        <div className="flex items-center justify-between p-6 pt-8 border-b flex-shrink-0">
          <h2 className="text-xl font-semibold text-gray-800">
            {format(parseISO(workDay.date), 'EEEE, MMMM d, yyyy')}
          </h2>
          <button 
            onClick={onClose} 
            onTouchStart={() => {}} // Enable touch events on iOS
            className="text-gray-400 hover:text-gray-600 p-3 -m-3 touch-manipulation"
            aria-label="Close modal"
            style={{ 
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent',
              minWidth: '44px',
              minHeight: '44px'
            }}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {!showPaymentConfirmation ? (
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-6">
              {/* Show editing options only if not paid */}
              {!formData.paid ? (
                <>
                  {/* Custom Amount Toggle */}
                  <div>
                    <label className="flex items-start space-x-3 cursor-pointer touch-manipulation">
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
                        className="w-5 h-5 mt-0.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 touch-manipulation"
                      />
                      <span className="text-sm font-medium text-gray-700 leading-tight">
                        Use custom amount for this day
                      </span>
                    </label>
                    
                    {!useCustomAmount && (
                      <div className="mt-3 text-sm text-gray-600 bg-gray-50 p-4 rounded-lg">
                        <div className="flex justify-between">
                          <span>Standard rate:</span>
                          <span className="font-medium">£{getDefaultAmount()}/day</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {useCustomAmount && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
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
                        className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 touch-manipulation"
                        placeholder="0.00"
                      />
                      <div className="mt-2 text-xs text-gray-500">
                        Set to £0.00 for work done for free
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notes (Optional)
                    </label>
                    <textarea
                      value={formData.notes || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value || undefined }))}
                      rows={3}
                      className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none touch-manipulation"
                      placeholder="Add notes about this work day (e.g., half day, overtime, special project...)"
                    />
                  </div>
                </>
              ) : (
                /* Show read-only information when paid */
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-3">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <h3 className="font-semibold text-green-800">Payment Completed</h3>
                    </div>
                    
                    {relatedPayment ? (
                      <div className="space-y-2 text-sm text-green-700">
                        <div className="flex justify-between">
                          <span>Payment Date:</span>
                          <span className="font-medium">{format(parseISO(relatedPayment.date), 'MMM d, yyyy')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Payment Method:</span>
                          <span className="font-medium">{relatedPayment.paymentType}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Amount Paid:</span>
                          <span className="font-medium">£{getWorkDayAmount().toFixed(2)}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2 text-sm text-green-700">
                        <div className="flex justify-between">
                          <span>Amount Paid:</span>
                          <span className="font-medium">£{getWorkDayAmount().toFixed(2)}</span>
                        </div>
                        <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded text-orange-700 text-xs">
                          ⚠️ Marked as paid but no payment record found
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Show work details in read-only format */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-700 mb-3">Work Details</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Amount:</span>
                        <span className="font-medium">
                          £{getWorkDayAmount().toFixed(2)}
                          {formData.customAmount !== undefined && (
                            <span className="text-blue-600 text-xs ml-1">(Custom)</span>
                          )}
                        </span>
                      </div>
                      {formData.notes && (
                        <div>
                          <span className="text-gray-600 block mb-1">Notes:</span>
                          <p className="text-gray-800 bg-white p-2 rounded border text-xs">
                            {formData.notes}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Payment Actions - Only for unpaid work days */}
              {!formData.paid && (
                <div className="border-t pt-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Payment Actions</h3>
                  
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={handleMarkAsPaid}
                      disabled={!formData.worked}
                      className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium touch-manipulation"
                    >
                      {!formData.worked ? 'Cannot Pay (Not Worked)' : 'Mark as Paid'}
                    </button>
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
              )}

              {/* Unmark Payment Action - Only for paid work days */}
              {formData.paid && (
                <div className="border-t pt-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Payment Actions</h3>
                  
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={handleUnmarkAsPaid}
                      className="w-full px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium touch-manipulation"
                    >
                      Unmark as Paid
                    </button>
                  </div>
                </div>
              )}

              {/* Work Details Locked Info - Only for paid work days */}
              {formData.paid && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-start space-x-2">
                    <svg className="w-4 h-4 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-blue-800">Work Details Locked</p>
                      <p className="text-xs text-blue-600 mt-1">
                        Work details cannot be modified once payment is completed. 
                        You can unmark as paid if changes are needed.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Mobile spacing to ensure buttons are accessible */}
              <div className="h-4 sm:hidden"></div>
            </div>

            {/* Footer - Fixed at bottom */}
            <div className="flex-shrink-0 border-t bg-white rounded-b-t-lg sm:rounded-b-lg">
              <div className="p-6 space-y-3">
                {!formData.paid ? (
                  <>
                    {/* Remove Day Button - Only for unpaid work days */}
                    <button
                      type="button"
                      onClick={() => onWorkDayRemoved(workDay)}
                      className="w-full px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium touch-manipulation"
                    >
                      Remove Work Day
                    </button>

                    {/* Form Actions */}
                    <div className="flex space-x-3">
                      <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium touch-manipulation"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium touch-manipulation"
                      >
                        Save Changes
                      </button>
                    </div>
                  </>
                ) : (
                  /* Actions for paid work days */
                  <div className="flex space-x-3">
                    <button
                      type="button"
                      onClick={onClose}
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium touch-manipulation"
                    >
                      Close
                    </button>
                  </div>
                )}
              </div>
            </div>
          </form>
        ) : (
          /* Payment Confirmation Dialog */
          <div className="flex-1 flex flex-col">
            <div className="flex-1 p-6 overflow-y-auto">
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
            </div>

            {/* Confirmation Footer - Fixed */}
            <div className="flex-shrink-0 border-t bg-white rounded-b-t-lg sm:rounded-b-lg">
              <div className="flex space-x-3 p-6">
                <button
                  onClick={() => {
                    setShowPaymentConfirmation(false)
                    setPaymentAction(null)
                    setPaymentError('')
                  }}
                  disabled={isProcessingPayment}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 font-medium touch-manipulation"
                >
                  Cancel
                </button>
                <button
                  onClick={executePaymentAction}
                  disabled={isProcessingPayment}
                  className={`flex-1 px-4 py-3 rounded-lg text-white transition-colors disabled:opacity-50 font-medium touch-manipulation ${
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
          </div>
        )}
      </div>
    </div>
  )
} 