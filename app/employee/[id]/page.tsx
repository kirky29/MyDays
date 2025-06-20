'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { format, parseISO } from 'date-fns'
import { firebaseService, Payment, PAYMENT_TYPES } from '../../../lib/firebase'
import PaymentModal from '../../components/PaymentModal'

interface Employee {
  id: string
  name: string
  dailyWage: number
}

interface WorkDay {
  id: string
  employeeId: string
  date: string
  worked: boolean
  paid: boolean
}

export default function EmployeeDetail() {
  const params = useParams()
  const employeeId = params.id as string
  
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [workDays, setWorkDays] = useState<WorkDay[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [syncStatus, setSyncStatus] = useState<'syncing' | 'synced' | 'error'>('syncing')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [selectedWorkDays, setSelectedWorkDays] = useState<string[]>([])
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Handle browser navigation with a different approach
  useEffect(() => {
    // Set a unique state for this page
    const currentState = { page: 'employee-detail', employeeId }
    window.history.replaceState(currentState, '', window.location.href)

    const handleBeforeUnload = () => {
      // This will trigger when the page is about to unload
      console.log('Page unloading')
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log('Page hidden')
      } else {
        console.log('Page visible')
        // Reload data when page becomes visible again
        if (mounted && employeeId) {
          window.location.reload()
        }
      }
    }

    // Add event listeners
    window.addEventListener('beforeunload', handleBeforeUnload)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [employeeId, mounted])

  // Set mounted state
  useEffect(() => {
    setMounted(true)
  }, [])

  // Data loading effect with simplified approach
  useEffect(() => {
    if (!employeeId || !mounted) return

    let isMounted = true
    let unsubscribeEmployees: (() => void) | undefined
    let unsubscribeWorkDays: (() => void) | undefined
    let unsubscribePayments: (() => void) | undefined

    const loadData = async () => {
      try {
        console.log('Loading data for employee:', employeeId)
        setLoading(true)
        setSyncStatus('syncing')
        setErrorMessage('')
        
        // Simple data loading without complex timeout logic
        const [employeesData, workDaysData, paymentsData] = await Promise.all([
          firebaseService.getEmployees(),
          firebaseService.getWorkDays(),
          firebaseService.getPayments()
        ])
        
        if (!isMounted) return
        
        const employees = employeesData as Employee[]
        const allWorkDays = workDaysData as WorkDay[]
        const allPayments = paymentsData as Payment[]
        
        const foundEmployee = employees.find(emp => emp.id === employeeId)
        if (!foundEmployee) {
          setErrorMessage('Employee not found')
          setSyncStatus('error')
          setLoading(false)
          return
        }
        
        setEmployee(foundEmployee)
        setWorkDays(allWorkDays.filter(day => day.employeeId === employeeId))
        setPayments(allPayments.filter(payment => payment.employeeId === employeeId))
        setSyncStatus('synced')
        setLoading(false)
        
        console.log('Data loaded successfully')
        
        // Set up listeners after data is loaded
        setupListeners()
        
      } catch (error: any) {
        console.error('Error loading data:', error)
        if (isMounted) {
          setSyncStatus('error')
          setErrorMessage(error.message || 'Failed to load data')
          setLoading(false)
        }
      }
    }

    // Set up real-time listeners
    const setupListeners = () => {
      if (!isMounted) return
      
      try {
        unsubscribeEmployees = firebaseService.subscribeToEmployees(
          (employeesData) => {
            if (!isMounted) return
            const employees = employeesData as Employee[]
            const foundEmployee = employees.find(emp => emp.id === employeeId)
            if (foundEmployee) {
              setEmployee(foundEmployee)
              setSyncStatus('synced')
              setErrorMessage('')
            }
          },
          (error: any) => {
            if (!isMounted) return
            console.error('Employees subscription error:', error)
            setSyncStatus('error')
            setErrorMessage(`Employees sync error: ${error.message}`)
          }
        )

        unsubscribeWorkDays = firebaseService.subscribeToWorkDays(
          (workDaysData) => {
            if (!isMounted) return
            const allWorkDays = workDaysData as WorkDay[]
            setWorkDays(allWorkDays.filter(day => day.employeeId === employeeId))
            setSyncStatus('synced')
            setErrorMessage('')
          },
          (error: any) => {
            if (!isMounted) return
            console.error('Work days subscription error:', error)
            setSyncStatus('error')
            setErrorMessage(`Work days sync error: ${error.message}`)
          }
        )

        unsubscribePayments = firebaseService.subscribeToPayments(
          (paymentsData) => {
            if (!isMounted) return
            const allPayments = paymentsData as Payment[]
            setPayments(allPayments.filter(payment => payment.employeeId === employeeId))
            setSyncStatus('synced')
            setErrorMessage('')
          },
          (error: any) => {
            if (!isMounted) return
            console.error('Payments subscription error:', error)
            setSyncStatus('error')
            setErrorMessage(`Payments sync error: ${error.message}`)
          }
        )
      } catch (error) {
        console.error('Error setting up listeners:', error)
      }
    }

    // Start loading data
    loadData()

    return () => {
      isMounted = false
      if (unsubscribeEmployees) unsubscribeEmployees()
      if (unsubscribeWorkDays) unsubscribeWorkDays()
      if (unsubscribePayments) unsubscribePayments()
    }
  }, [employeeId, mounted])

  const handleBackNavigation = () => {
    // Use window.location instead of router to ensure clean navigation
    window.location.href = '/'
  }

  const toggleWorkDay = async (date: string) => {
    const existingDay = workDays.find(day => day.date === date)
    
    try {
      setSyncStatus('syncing')
      setErrorMessage('')
      if (existingDay) {
        const updatedWorkDay = { ...existingDay, worked: !existingDay.worked }
        await firebaseService.addWorkDay(updatedWorkDay)
      } else {
        const newWorkDay: WorkDay = {
          id: Date.now().toString(),
          employeeId,
          date,
          worked: true,
          paid: false
        }
        await firebaseService.addWorkDay(newWorkDay)
      }
    } catch (error: any) {
      console.error('Error updating work day:', error)
      setSyncStatus('error')
      setErrorMessage(`Failed to update work day: ${error.message}`)
    }
  }

  const toggleWorkDaySelection = (workDayId: string) => {
    setSelectedWorkDays(prev => 
      prev.includes(workDayId) 
        ? prev.filter(id => id !== workDayId)
        : [...prev, workDayId]
    )
  }

  const selectAllUnpaid = () => {
    const unpaidWorkDays = workDays.filter(day => day.worked && !day.paid)
    setSelectedWorkDays(unpaidWorkDays.map(day => day.id))
  }

  const clearSelection = () => {
    setSelectedWorkDays([])
  }

  const calculateStats = () => {
    if (!employee) return { totalWorked: 0, totalPaid: 0, totalOwed: 0, totalEarned: 0 }
    
    const workedDays = workDays.filter(day => day.worked)
    const paidDays = workDays.filter(day => day.paid)
    
    const totalWorked = workedDays.length
    const totalPaid = paidDays.length
    const totalEarned = totalWorked * employee.dailyWage
    const totalOwed = totalEarned - (totalPaid * employee.dailyWage)
    
    return { totalWorked, totalPaid, totalOwed, totalEarned }
  }

  const getWorkDay = (date: string) => {
    return workDays.find(day => day.date === date)
  }

  const deleteEmployee = async () => {
    if (!employee) return
    
    if (confirm(`Are you sure you want to delete ${employee.name}? This will also delete all their work records and payment history.`)) {
      try {
        setSyncStatus('syncing')
        setErrorMessage('')
        await Promise.all([
          firebaseService.deleteEmployee(employee.id),
          firebaseService.deleteWorkDaysForEmployee(employee.id),
          firebaseService.deletePaymentsForEmployee(employee.id)
        ])
        handleBackNavigation()
      } catch (error: any) {
        console.error('Error deleting employee:', error)
        setSyncStatus('error')
        setErrorMessage(`Failed to delete employee: ${error.message}`)
      }
    }
  }

  const retryConnection = () => {
    window.location.reload()
  }

  const handlePaymentComplete = () => {
    setSelectedWorkDays([])
  }

  // Don't render anything until mounted (prevents hydration issues)
  if (!mounted) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-md">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">Initializing...</p>
          </div>
        </div>
      </div>
    )
  }

  // Show loading state
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-md">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600 mb-2">Loading employee data...</p>
            <p className="text-sm text-gray-500">Employee ID: {employeeId}</p>
            <p className="text-sm text-gray-500">Status: {syncStatus}</p>
            {errorMessage && (
              <p className="text-sm text-red-500 mt-2">{errorMessage}</p>
            )}
            <div className="mt-4 space-y-2">
              <button
                onClick={retryConnection}
                className="block text-sm text-blue-600 hover:text-blue-800 underline"
              >
                Reload if stuck
              </button>
              <button
                onClick={handleBackNavigation}
                className="block text-sm text-gray-600 hover:text-gray-800 underline"
              >
                Go back to main page
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Show error state
  if (!employee) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-md">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-gray-800 mb-4">Employee Not Found</h1>
          <button
            onClick={handleBackNavigation}
            className="bg-primary text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors"
          >
            Back to Employees
          </button>
        </div>
      </div>
    )
  }

  const stats = calculateStats()
  const unpaidWorkDays = workDays.filter(day => day.worked && !day.paid)
  const selectedWorkDayObjects = workDays.filter(day => selectedWorkDays.includes(day.id))

  return (
    <div className="container mx-auto px-4 py-6 max-w-md">
      {/* Sync Status Indicator */}
      <div className="mb-4 flex items-center justify-center">
        <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
          syncStatus === 'syncing' ? 'bg-yellow-100 text-yellow-800' :
          syncStatus === 'synced' ? 'bg-green-100 text-green-800' :
          'bg-red-100 text-red-800'
        }`}>
          <div className={`w-2 h-2 rounded-full ${
            syncStatus === 'syncing' ? 'bg-yellow-500 animate-pulse' :
            syncStatus === 'synced' ? 'bg-green-500' :
            'bg-red-500'
          }`}></div>
          <span>
            {syncStatus === 'syncing' ? 'Syncing...' :
             syncStatus === 'synced' ? 'Synced' :
             'Sync Error'}
          </span>
        </div>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Sync Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{errorMessage}</p>
              </div>
              <div className="mt-3">
                <button
                  onClick={retryConnection}
                  className="text-sm bg-red-100 text-red-800 px-3 py-1 rounded-md hover:bg-red-200 transition-colors"
                >
                  Retry Connection
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={handleBackNavigation}
          className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
        >
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <button
          onClick={deleteEmployee}
          className="text-danger hover:text-red-700 text-sm"
        >
          Delete Employee
        </button>
      </div>

      {/* Employee Info */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">{employee.name}</h1>
        <p className="text-lg text-gray-600 mb-4">£{employee.dailyWage}/day</p>
        
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.totalWorked}</div>
            <div className="text-sm text-blue-800">Days Worked</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.totalPaid}</div>
            <div className="text-sm text-green-800">Days Paid</div>
          </div>
        </div>
      </div>

      {/* Financial Summary */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">Financial Summary</h2>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Total Earned:</span>
            <span className="font-semibold text-gray-800">£{stats.totalEarned.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Total Paid:</span>
            <span className="font-semibold text-green-600">£{(stats.totalPaid * employee.dailyWage).toFixed(2)}</span>
          </div>
          <div className="border-t pt-3">
            <div className="flex justify-between items-center">
              <span className="text-lg font-medium text-gray-800">Outstanding:</span>
              <span className={`text-lg font-bold ${stats.totalOwed > 0 ? 'text-red-600' : 'text-green-600'}`}>
                £{stats.totalOwed.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Payment Section */}
      {unpaidWorkDays.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-700">Bulk Payment</h2>
            <div className="flex space-x-2">
              <button
                onClick={selectAllUnpaid}
                className="text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded-md hover:bg-blue-200 transition-colors"
              >
                Select All Unpaid
              </button>
              <button
                onClick={clearSelection}
                className="text-sm bg-gray-100 text-gray-800 px-3 py-1 rounded-md hover:bg-gray-200 transition-colors"
              >
                Clear
              </button>
            </div>
          </div>

          {selectedWorkDays.length > 0 && (
            <div className="bg-green-50 rounded-lg p-4 mb-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-green-800">
                  {selectedWorkDays.length} day(s) selected
                </span>
                <span className="text-lg font-bold text-green-600">
                  £{(selectedWorkDays.length * employee.dailyWage).toFixed(2)}
                </span>
              </div>
              <button
                onClick={() => setShowPaymentModal(true)}
                className="w-full mt-3 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors"
              >
                Process Payment
              </button>
            </div>
          )}
        </div>
      )}

      {/* Work History */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">Work History</h2>
        
        {workDays.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No work days recorded yet.</p>
        ) : (
          <div className="space-y-3">
            {workDays
              .filter(day => day.worked)
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .map(workDay => (
                <div key={workDay.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={selectedWorkDays.includes(workDay.id)}
                        onChange={() => toggleWorkDaySelection(workDay.id)}
                        disabled={workDay.paid}
                        className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                      />
                      <div>
                        <div className="font-medium text-gray-800">
                          {format(parseISO(workDay.date), 'EEEE, MMMM d, yyyy')}
                        </div>
                        <div className="text-sm text-gray-600">
                          {format(parseISO(workDay.date), 'MMM d, yyyy')}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-green-600">£{employee.dailyWage}</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        workDay.paid 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-orange-100 text-orange-800'
                      }`}>
                        {workDay.paid ? 'Paid' : 'Unpaid'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Payment History */}
      {payments.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Payment History</h2>
          <div className="space-y-3">
            {payments
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .map(payment => (
                <div key={payment.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-medium text-gray-800">
                        £{payment.amount.toFixed(2)} - {payment.paymentType}
                      </div>
                      <div className="text-sm text-gray-600">
                        {format(parseISO(payment.date), 'MMM d, yyyy')}
                      </div>
                    </div>
                    <span className="text-xs text-gray-500">
                      {format(parseISO(payment.createdAt), 'MMM d, h:mm a')}
                    </span>
                  </div>
                  {payment.notes && (
                    <div className="text-sm text-gray-600 mt-2">
                      <span className="font-medium">Notes:</span> {payment.notes}
                    </div>
                  )}
                  <div className="text-xs text-gray-500 mt-2">
                    {payment.workDayIds.length} work day(s) paid
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Payment Modal */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        employee={employee}
        selectedWorkDays={selectedWorkDayObjects}
        onPaymentComplete={handlePaymentComplete}
      />
    </div>
  )
} 