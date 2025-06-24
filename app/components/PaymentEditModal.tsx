'use client'

import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { firebaseService, PAYMENT_TYPES, PaymentType } from '../../lib/firebase'
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
  const [paymentType, setPaymentType] = useState<PaymentType>(payment.paymentType as PaymentType)
  const [notes, setNotes] = useState(payment.notes || '')
  const [paymentDate, setPaymentDate] = useState(payment.date)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string>('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [selectedWorkDayIds, setSelectedWorkDayIds] = useState<string[]>(payment.workDayIds)
  
  // Prevent background scrolling when modal is open
  useBodyScrollLock(isOpen)

  if (!isOpen) return null

  // Get the work days that were paid in this payment
  const paidWorkDays = workDays.filter(wd => 
    payment.workDayIds.includes(wd.id)
  ).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  // Get currently selected work days for the payment
  const currentlySelectedWorkDays = paidWorkDays.filter(wd => selectedWorkDayIds.includes(wd.id))
  const newTotalAmount = currentlySelectedWorkDays.length * employee.dailyWage

  const handleUpdatePayment = async () => {
    if (selectedWorkDayIds.length === 0) {
      setError('You must select at least one work day for this payment.')
      return
    }

    setIsProcessing(true)
    setError('')
    
    try {
      // Handle work days that were removed from the payment using robust service
      const removedWorkDayIds = payment.workDayIds.filter(id => !selectedWorkDayIds.includes(id))
      if (removedWorkDayIds.length > 0) {
        console.log('Unmarking removed work days:', removedWorkDayIds)
        await firebaseService.forceUnmarkWorkDaysAsPaid(removedWorkDayIds, 'update')
      }

      // Update payment record with new work day selection and amount
      const updatedPayment: Payment = {
        ...payment,
        workDayIds: selectedWorkDayIds,
        amount: newTotalAmount,
        paymentType,
        date: paymentDate
      }

      // Only add notes if they exist and are not empty
      if (notes.trim()) {
        updatedPayment.notes = notes.trim()
      }

      console.log('Updating payment record:', updatedPayment)
      await firebaseService.addPayment(updatedPayment)
      
      // Mark new work days as paid (if any were added)
      const addedWorkDayIds = selectedWorkDayIds.filter(id => !payment.workDayIds.includes(id))
      if (addedWorkDayIds.length > 0) {
        console.log('Marking new work days as paid:', addedWorkDayIds)
        const workDaysToUpdate = workDays.filter(wd => addedWorkDayIds.includes(wd.id))
        const updatePromises = workDaysToUpdate.map(async (workDay) => {
          const updatedWorkDay = { ...workDay, paid: true }
          return firebaseService.addWorkDay(updatedWorkDay)
        })
        await Promise.all(updatePromises)
      }
      
      onPaymentUpdated()
      onClose()
    } catch (error: any) {
      console.error('Error updating payment:', error)
      setError(`Failed to update payment: ${error.message}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const toggleWorkDaySelection = (workDayId: string) => {
    setSelectedWorkDayIds(prev => 
      prev.includes(workDayId) 
        ? prev.filter(id => id !== workDayId)
        : [...prev, workDayId]
    )
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
            {/* Work Days Selection */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-700">
                  Work Days ({paidWorkDays.length} day{paidWorkDays.length !== 1 ? 's' : ''})
                </h3>
                <span className="text-xs text-gray-600">
                  {selectedWorkDayIds.length} selected
                </span>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 max-h-40 overflow-y-auto">
                <div className="space-y-2">
                  {paidWorkDays.map(workDay => {
                    const isSelected = selectedWorkDayIds.includes(workDay.id)
                    return (
                      <div 
                        key={workDay.id} 
                        className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                          isSelected ? 'bg-blue-50 border border-blue-200' : 'bg-white border border-gray-200 hover:bg-gray-50'
                        }`}
                        onClick={() => toggleWorkDaySelection(workDay.id)}
                      >
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleWorkDaySelection(workDay.id)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className={`font-medium text-sm ${isSelected ? 'text-blue-800' : 'text-gray-800'}`}>
                            {format(parseISO(workDay.date), 'EEEE, MMM d, yyyy')}
                          </span>
                        </div>
                        <span className={`font-semibold text-sm ${isSelected ? 'text-blue-600' : 'text-green-600'}`}>
                          £{employee.dailyWage}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
              {selectedWorkDayIds.length < paidWorkDays.length && (
                <p className="text-xs text-amber-600 mt-2 flex items-center">
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  Unselected work days will be marked as unpaid
                </p>
              )}
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
            <div className={`rounded-lg p-4 border ${
              newTotalAmount !== payment.amount 
                ? 'bg-amber-50 border-amber-200' 
                : 'bg-green-50 border-green-200'
            }`}>
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-gray-800">Total Amount:</span>
                <div className="text-right">
                  <span className={`text-xl font-bold ${
                    newTotalAmount !== payment.amount ? 'text-amber-600' : 'text-green-600'
                  }`}>
                    £{newTotalAmount.toFixed(2)}
                  </span>
                  {newTotalAmount !== payment.amount && (
                    <div className="text-xs text-gray-600">
                      Was: £{payment.amount.toFixed(2)}
                    </div>
                  )}
                </div>
              </div>
              <div className="text-xs text-gray-600 mt-1">
                {selectedWorkDayIds.length} work day{selectedWorkDayIds.length !== 1 ? 's' : ''} × £{employee.dailyWage} each
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
              disabled={isProcessing || selectedWorkDayIds.length === 0}
              className="btn btn-primary btn-lg w-full"
            >
              {isProcessing ? 'Updating...' : 
               newTotalAmount !== payment.amount ? 
               `Update Payment (£${newTotalAmount.toFixed(2)})` : 
               'Update Payment'}
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
                  <h4 className="text-sm font-semibold text-red-800 mb-1">Delete Entire Payment?</h4>
                  <p className="text-xs text-red-600">
                    This will mark all {paidWorkDays.length} work day{paidWorkDays.length !== 1 ? 's' : ''} as unpaid and delete the payment record. This cannot be undone.
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