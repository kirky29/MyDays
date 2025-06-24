'use client'

import { useState, useEffect } from 'react'
import { format, parseISO } from 'date-fns'

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

interface WorkDayEditModalProps {
  isOpen: boolean
  onClose: () => void
  workDay: WorkDay
  employee: Employee
  onWorkDayUpdated: (workDay: WorkDay) => void
  onWorkDayRemoved: (workDay: WorkDay) => void
}

export default function WorkDayEditModal({
  isOpen,
  onClose,
  workDay,
  employee,
  onWorkDayUpdated,
  onWorkDayRemoved
}: WorkDayEditModalProps) {
  const [formData, setFormData] = useState<WorkDay>(workDay)
  const [useCustomAmount, setUseCustomAmount] = useState(workDay.customAmount !== undefined)

  useEffect(() => {
    setFormData(workDay)
    setUseCustomAmount(workDay.customAmount !== undefined)
  }, [workDay])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const updatedWorkDay = {
      ...formData,
      customAmount: useCustomAmount ? formData.customAmount : undefined
    }
    
    onWorkDayUpdated(updatedWorkDay)
  }

  const getDefaultAmount = () => {
    if (employee.wageChangeDate && employee.previousWage && workDay.date < employee.wageChangeDate) {
      return employee.previousWage
    }
    return employee.dailyWage
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

          {/* Paid Status Toggle */}
          <div>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.paid}
                onChange={(e) => setFormData(prev => ({ ...prev, paid: e.target.checked }))}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">
                Mark as paid
              </span>
            </label>
            
            {formData.paid && (
              <div className="mt-2 text-sm text-green-600 bg-green-50 p-3 rounded-lg">
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="font-medium">This work day will be marked as paid</span>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col space-y-3 pt-4">
            {/* Remove Day Button */}
            <button
              type="button"
              onClick={() => onWorkDayRemoved(workDay)}
              disabled={formData.paid}
              className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {formData.paid ? 'Cannot Remove (Already Paid)' : 'Remove Work Day'}
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
      </div>
    </div>
  )
} 