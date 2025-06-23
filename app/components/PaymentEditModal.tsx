'use client'

import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { firebaseService, PAYMENT_TYPES, PaymentType } from '../../lib/firebase'
import type { Payment, WorkDay, Employee } from '../../lib/store'

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
  const [paymentType, setPaymentType] = useState<PaymentType>(payment.paymentType as PaymentType)
  const [notes, setNotes] = useState(payment.notes || '')
  const [paymentDate, setPaymentDate] = useState(payment.date)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string>('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  if (!isOpen) return null

  // Get the work days that were paid in this payment
  const paidWorkDays = workDays.filter(wd => 
    payment.workDayIds.includes(wd.id)
  ).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  const handleUpdatePayment = async () => {
    setIsProcessing(true)
    setError('')
    
    try {
      // Update payment record
      const updatedPayment: Payment = {
        ...payment,
        paymentType,
        notes: notes.trim() || undefined,
        date: paymentDate
      }

      await firebaseService.addPayment(updatedPayment)
      onPaymentUpdated()
      onClose()
    } catch (error: any) {
      console.error('Error updating payment:', error)
      setError(`Failed to update payment: ${error.message}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDeletePayment = async () => {
    setIsProcessing(true)
    setError('')
    
    try {
      // Mark all work days as unpaid
      const updatePromises = paidWorkDays.map(async (workDay) => {
        const updatedWorkDay = { ...workDay, paid: false }
        return firebaseService.addWorkDay(updatedWorkDay)
      })

      await Promise.all(updatePromises)
      
      // Delete the payment record
      await firebaseService.deletePayment(payment.id)
      
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
      <div className="card max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="card-header">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Edit Payment</h2>
              <p className="text-sm text-gray-600">£{payment.amount.toFixed(2)} • {employee.name}</p>
            </div>
            <button
              onClick={onClose}
              className="btn btn-secondary btn-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="card-body">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
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

          {/* Payment Details */}
          <div className="space-y-4">
            {/* Work Days Paid (Read-only) */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">
                Work Days Paid ({paidWorkDays.length} day{paidWorkDays.length !== 1 ? 's' : ''})
              </h3>
              <div className="bg-gray-50 rounded-lg p-3 max-h-32 overflow-y-auto">
                <div className="space-y-2">
                  {paidWorkDays.map(workDay => (
                    <div key={workDay.id} className="flex items-center justify-between text-sm">
                      <span className="font-medium text-gray-800">
                        {format(parseISO(workDay.date), 'EEEE, MMM d, yyyy')}
                      </span>
                      <span className="font-semibold text-green-600">
                        £{employee.dailyWage}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Payment Date */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Payment Date
              </label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Payment Type */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Payment Method
              </label>
              <select
                value={paymentType}
                onChange={(e) => setPaymentType(e.target.value as PaymentType)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {PAYMENT_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes about this payment..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>

            {/* Payment Summary */}
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-gray-800">Total Amount:</span>
                <span className="text-xl font-bold text-green-600">£{payment.amount.toFixed(2)}</span>
              </div>
              <div className="text-xs text-gray-600 mt-1">
                {paidWorkDays.length} work day{paidWorkDays.length !== 1 ? 's' : ''} × £{employee.dailyWage} each
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="card-footer">
          <div className="flex flex-col space-y-3">
            {/* Update Button */}
            <button
              onClick={handleUpdatePayment}
              disabled={isProcessing}
              className="btn btn-primary btn-lg w-full"
            >
              {isProcessing ? 'Updating...' : 'Update Payment'}
            </button>

            {/* Delete Section */}
            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="btn btn-secondary btn-md w-full text-red-600 border-red-200 hover:bg-red-50"
              >
                Delete Payment
              </button>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="text-center mb-3">
                  <h4 className="text-sm font-semibold text-red-800 mb-1">Delete Payment?</h4>
                  <p className="text-xs text-red-600">
                    This will mark all {paidWorkDays.length} work day{paidWorkDays.length !== 1 ? 's' : ''} as unpaid and cannot be undone.
                  </p>
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={isProcessing}
                    className="flex-1 btn btn-secondary btn-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeletePayment}
                    disabled={isProcessing}
                    className="flex-1 btn btn-sm bg-red-600 text-white hover:bg-red-700"
                  >
                    {isProcessing ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            )}

            {/* Cancel Button */}
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="btn btn-secondary btn-md w-full"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
} 