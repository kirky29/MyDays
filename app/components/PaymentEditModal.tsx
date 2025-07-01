'use client'

import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { firebaseService } from '../../lib/firebase'
import type { Payment, WorkDay, Employee } from '../../lib/store'
import { useBodyScrollLock } from '../../lib/hooks/useBodyScrollLock'

interface PaymentEditModalProps {
  isOpen: boolean
  onClose: () => void
  payment: Payment
  employee: Employee
  workDays: WorkDay[]
  onPaymentUpdated: () => void
}

export default function PaymentEditModal({
  isOpen,
  onClose,
  payment,
  employee,
  workDays,
  onPaymentUpdated
}: PaymentEditModalProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string>('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [removingWorkDayId, setRemovingWorkDayId] = useState<string | null>(null)
  
  // Prevent background scrolling when modal is open
  useBodyScrollLock(isOpen)

  if (!isOpen) return null

  // Get the work days that were paid in this payment
  const paidWorkDays = workDays.filter(wd => 
    payment.workDayIds.includes(wd.id)
  ).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())



  const handleRemoveWorkDay = async (workDayId: string) => {
    if (!confirm('Remove this work day from the payment? It will be marked as unpaid.')) {
      return
    }

    setRemovingWorkDayId(workDayId)
    setError('')
    
    try {
      console.log('Removing work day from payment:', workDayId)
      
      // Calculate new work day IDs array
      const updatedWorkDayIds = payment.workDayIds.filter(id => id !== workDayId)
      
      // If this was the last work day, delete the entire payment
      if (updatedWorkDayIds.length === 0) {
        if (confirm('This is the last work day in this payment. Delete the entire payment?')) {
          await handleDeletePayment()
          return
        } else {
          setRemovingWorkDayId(null)
          return
        }
      }
      
      // Unmark the work day as paid
      const workDayToUpdate = workDays.find(wd => wd.id === workDayId)
      if (workDayToUpdate) {
        await firebaseService.addWorkDay({
          ...workDayToUpdate,
          paid: false
        })
      }
      
      // Calculate new payment amount
      const remainingWorkDays = workDays.filter(wd => updatedWorkDayIds.includes(wd.id))
      const newAmount = remainingWorkDays.reduce((sum, wd) => {
        const getWorkDayAmount = (workDay: WorkDay) => {
          if (workDay.customAmount !== undefined) {
            return workDay.customAmount
          }
          if (employee.wageChangeDate && employee.previousWage && workDay.date < employee.wageChangeDate) {
            return employee.previousWage
          }
          return employee.dailyWage
        }
        return sum + getWorkDayAmount(wd)
      }, 0)
      
      // Update the payment record
      const updatedPayment = {
        ...payment,
        workDayIds: updatedWorkDayIds,
        amount: newAmount
      }
      
      await firebaseService.addPayment(updatedPayment)
      
      console.log('Work day removed from payment successfully')
      onPaymentUpdated()
    } catch (error: any) {
      console.error('Error removing work day from payment:', error)
      setError(`Failed to remove work day: ${error.message}`)
    } finally {
      setRemovingWorkDayId(null)
    }
  }

  const handleDeletePayment = async () => {
    setIsProcessing(true)
    setError('')
    
    try {
      console.log('Deleting payment and unmarking work days:', payment.id)
      
      // Use robust service to unmark work days and delete payment
      await firebaseService.forceUnmarkWorkDaysAsPaid(payment.workDayIds, 'delete')
      
      // Delete the payment record
      await firebaseService.deletePayment(payment.id)
      
      console.log('Payment deleted successfully')
      onPaymentUpdated()
      onClose()
    } catch (error: any) {
      console.error('Error deleting payment:', error)
      setError(`Failed to delete payment: ${error.message}`)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 pt-8 border-b">
          <h2 className="text-xl font-semibold text-gray-800">
            Payment Details
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>{error}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Payment Summary */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-3">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="font-semibold text-green-800">Payment Completed</h3>
            </div>
            
            <div className="space-y-2 text-sm text-green-700">
              <div className="flex justify-between">
                <span>Payment Date:</span>
                <span className="font-medium">{format(parseISO(payment.date), 'MMM d, yyyy')}</span>
              </div>
              <div className="flex justify-between">
                <span>Payment Method:</span>
                <span className="font-medium">{payment.paymentType}</span>
              </div>
              <div className="flex justify-between">
                <span>Amount Paid:</span>
                <span className="font-medium">£{payment.amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Employee:</span>
                <span className="font-medium">{employee.name}</span>
              </div>
            </div>
          </div>

          {/* Work Days Covered */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-gray-700">Work Days Covered ({paidWorkDays.length})</h4>
            </div>
            {paidWorkDays.length > 1 && (
              <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
                <svg className="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Payment amount will be automatically recalculated when work days are removed.
              </div>
            )}
            <div className="space-y-2">
              {paidWorkDays.map(workDay => {
                // Calculate the actual amount for this work day
                const getWorkDayAmount = (wd: any) => {
                  if (wd.customAmount !== undefined) {
                    return wd.customAmount
                  }
                  if (employee.wageChangeDate && employee.previousWage && wd.date < employee.wageChangeDate) {
                    return employee.previousWage
                  }
                  return employee.dailyWage
                }
                
                const isRemoving = removingWorkDayId === workDay.id
                
                return (
                  <div key={workDay.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 text-sm">
                    <div className="flex-1">
                      <div className="text-gray-800 font-medium">
                        {format(parseISO(workDay.date), 'EEEE, MMM d, yyyy')}
                      </div>
                      <div className="text-gray-600 text-xs mt-1">
                        £{getWorkDayAmount(workDay).toFixed(2)}
                        {workDay.customAmount !== undefined && (
                          <span className="text-blue-600 ml-1">(Custom amount)</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveWorkDay(workDay.id)}
                      disabled={isRemoving || isProcessing}
                      className="ml-3 p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Remove this work day from payment"
                    >
                      {isRemoving ? (
                        <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      )}
                    </button>
                  </div>
                )
              })}
            </div>
            
            {payment.notes && (
              <div className="mt-3 pt-3 border-t border-gray-300">
                <span className="text-gray-600 text-sm font-medium block mb-1">Payment Notes:</span>
                <p className="text-gray-700 text-sm bg-white p-2 rounded border">
                  {payment.notes}
                </p>
              </div>
            )}
          </div>

          {/* Delete Payment Section */}
          {!showDeleteConfirm ? (
            <div className="border-t pt-4">
              <button
                onClick={() => setShowDeleteConfirm(true)}
                disabled={removingWorkDayId !== null}
                className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Delete Entire Payment
              </button>
            </div>
          ) : (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="text-center mb-3">
                <h4 className="text-sm font-semibold text-red-800 mb-1">Delete Entire Payment?</h4>
                <p className="text-xs text-red-600">
                  This will mark all {paidWorkDays.length} work day{paidWorkDays.length !== 1 ? 's' : ''} as unpaid and delete the payment record. This cannot be undone.
                </p>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isProcessing}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeletePayment}
                  disabled={isProcessing}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {isProcessing ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          )}

          {/* Close Button */}
          <div className="flex space-x-3 pt-4">
            <button
              onClick={onClose}
              disabled={isProcessing || removingWorkDayId !== null}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
} 