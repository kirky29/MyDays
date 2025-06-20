'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { firebaseService, PAYMENT_TYPES, PaymentType, Payment } from '../../lib/firebase'

interface WorkDay {
  id: string
  employeeId: string
  date: string
  worked: boolean
  paid: boolean
}

interface Employee {
  id: string
  name: string
  dailyWage: number
}

interface PaymentModalProps {
  isOpen: boolean
  onClose: () => void
  employee: Employee
  selectedWorkDays: WorkDay[]
  onPaymentComplete: () => void
}

export default function PaymentModal({
  isOpen,
  onClose,
  employee,
  selectedWorkDays,
  onPaymentComplete
}: PaymentModalProps) {
  const [paymentType, setPaymentType] = useState<PaymentType>('Bank Transfer')
  const [notes, setNotes] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string>('')

  if (!isOpen) return null

  const totalAmount = selectedWorkDays.length * employee.dailyWage
  const selectedDates = selectedWorkDays.map(day => format(new Date(day.date), 'MMM d, yyyy'))

  const handlePayment = async () => {
    if (selectedWorkDays.length === 0) return

    setIsProcessing(true)
    setError('')
    
    try {
      console.log('Starting payment process...', {
        employeeId: employee.id,
        selectedWorkDays: selectedWorkDays.length,
        totalAmount
      })

      const payment: Payment = {
        id: Date.now().toString(),
        employeeId: employee.id,
        workDayIds: selectedWorkDays.map(day => day.id),
        amount: totalAmount,
        paymentType,
        notes: notes.trim() || undefined,
        date: format(new Date(), 'yyyy-MM-dd'),
        createdAt: new Date().toISOString()
      }

      console.log('Payment object created:', payment)
      
      // Add payment record first
      console.log('Adding payment to Firebase...')
      await firebaseService.addPayment(payment)
      console.log('Payment added successfully')

      // Mark work days as paid
      console.log('Updating work days as paid...')
      const updatePromises = selectedWorkDays.map(async (workDay) => {
        const updatedWorkDay = { ...workDay, paid: true }
        console.log('Updating work day:', workDay.id, 'as paid')
        return firebaseService.addWorkDay(updatedWorkDay)
      })

      await Promise.all(updatePromises)
      console.log('All work days updated successfully')
      
      onPaymentComplete()
      onClose()
    } catch (error: any) {
      console.error('Error processing payment:', error)
      const errorMessage = error.message || 'Unknown error occurred'
      setError(`Payment failed: ${errorMessage}`)
      
      // Show error for 5 seconds then clear
      setTimeout(() => setError(''), 5000)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-800">Process Payment</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
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
                  <h3 className="text-sm font-medium text-red-800">Payment Error</h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>{error}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Employee Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-800 mb-2">{employee.name}</h3>
            <p className="text-sm text-gray-600">£{employee.dailyWage}/day</p>
          </div>

          {/* Selected Days */}
          <div>
            <h3 className="font-medium text-gray-700 mb-3">Selected Work Days ({selectedWorkDays.length})</h3>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {selectedDates.map((date, index) => (
                <div key={index} className="flex items-center justify-between bg-blue-50 rounded-lg p-3">
                  <span className="text-sm font-medium text-blue-800">{date}</span>
                  <span className="text-sm font-bold text-blue-600">£{employee.dailyWage}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Total Amount */}
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold text-gray-800">Total Amount:</span>
              <span className="text-2xl font-bold text-green-600">£{totalAmount.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Type
            </label>
            <select
              value={paymentType}
              onChange={(e) => setPaymentType(e.target.value as PaymentType)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {PAYMENT_TYPES.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about this payment..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex space-x-3 p-6 border-t">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handlePayment}
            disabled={isProcessing || selectedWorkDays.length === 0}
            className="flex-1 px-4 py-2 bg-primary text-white rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? 'Processing...' : `Pay £${totalAmount.toFixed(2)}`}
          </button>
        </div>
      </div>
    </div>
  )
} 