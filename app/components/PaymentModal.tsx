'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { PAYMENT_TYPES, PaymentType, Payment } from '../../lib/firebase'

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

  if (!isOpen) return null

  const totalAmount = selectedWorkDays.length * employee.dailyWage
  const selectedDates = selectedWorkDays.map(day => format(new Date(day.date), 'MMM d, yyyy'))

  const handlePayment = async () => {
    if (selectedWorkDays.length === 0) return

    setIsProcessing(true)
    try {
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

      // Import firebaseService dynamically to avoid circular imports
      const { firebaseService } = await import('../../lib/firebase')
      
      // Add payment record
      await firebaseService.addPayment(payment)

      // Mark work days as paid
      const updatePromises = selectedWorkDays.map(workDay => {
        const updatedWorkDay = { ...workDay, paid: true }
        return firebaseService.addWorkDay(updatedWorkDay)
      })

      await Promise.all(updatePromises)
      
      onPaymentComplete()
      onClose()
    } catch (error) {
      console.error('Error processing payment:', error)
      alert('Failed to process payment. Please try again.')
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