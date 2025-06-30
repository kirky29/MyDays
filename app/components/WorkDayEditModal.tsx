'use client'

import { useState, useEffect } from 'react'
import { format, parseISO } from 'date-fns'
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
  const [useCustomAmount, setUseCustomAmount] = useState(false)
  const [customAmountInput, setCustomAmountInput] = useState<string>('')
  
  // Prevent background scrolling when modal is open
  useBodyScrollLock(isOpen)

  // Check if this is a future work day
  const isFutureWorkDay = new Date(workDay.date) > new Date()

  // Reset form when workDay changes
  useEffect(() => {
    setFormData(workDay)
    setUseCustomAmount(workDay.customAmount !== undefined)
    setCustomAmountInput(workDay.customAmount?.toString() || '')
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
          <div>
            <h2 className="text-xl font-semibold text-gray-800">
              {format(parseISO(workDay.date), 'EEEE, MMMM d, yyyy')}
            </h2>
            {isFutureWorkDay && (
              <p className="text-sm text-blue-600 mt-1">Future Work Day</p>
            )}
          </div>
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

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Show editing options for unpaid work days */}
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
                      value={customAmountInput}
                      onChange={(e) => {
                        setCustomAmountInput(e.target.value)
                        // Update formData with parsed number, default to 0 if empty or invalid
                        const parsedValue = e.target.value === '' ? 0 : parseFloat(e.target.value) || 0
                        setFormData(prev => ({ ...prev, customAmount: parsedValue }))
                      }}
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
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value || '' }))}
                    rows={3}
                    className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none touch-manipulation"
                    placeholder={isFutureWorkDay ? "Add notes about this scheduled work..." : "Add notes about this work day (e.g., half day, overtime, special project...)"}
                  />
                </div>
                
                {/* Future work day info */}
                {isFutureWorkDay && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-start space-x-2">
                      <svg className="w-4 h-4 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <p className="text-sm font-medium text-blue-800">Future Work Day</p>
                        <p className="text-xs text-blue-600 mt-1">
                          Payment options will be available after the work is completed.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
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
                  
                  {payments.find(payment => 
                    payment.workDayIds.includes(workDay.id)
                  ) && (
                    <div className="space-y-2 text-sm text-green-700">
                      <div className="flex justify-between">
                        <span>Amount Paid:</span>
                        <span className="font-medium">£{getWorkDayAmount().toFixed(2)}</span>
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
                      Use the bulk payment system to manage payments.
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
              {/* Remove Day Button - Available for all work days */}
              <button
                type="button"
                onClick={() => onWorkDayRemoved(workDay)}
                className="w-full px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium touch-manipulation"
              >
                Remove Work Day
              </button>

              {/* Form Actions - Available for all work days */}
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
                  disabled={formData.paid} // Disable editing for paid work days
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium touch-manipulation"
                >
                  {formData.paid ? 'Paid (Locked)' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
} 