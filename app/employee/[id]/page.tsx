'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { format, parseISO } from 'date-fns'
import { firebaseService } from '../../../lib/firebase'

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
  const router = useRouter()
  const employeeId = params.id as string
  
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [workDays, setWorkDays] = useState<WorkDay[]>([])
  const [loading, setLoading] = useState(true)
  const [syncStatus, setSyncStatus] = useState<'syncing' | 'synced' | 'error'>('syncing')
  const [errorMessage, setErrorMessage] = useState<string>('')

  // Load employee and work days data
  useEffect(() => {
    const loadEmployeeData = async () => {
      try {
        setLoading(true)
        setSyncStatus('syncing')
        setErrorMessage('')
        
        // Load all employees and work days
        const [employeesData, workDaysData] = await Promise.all([
          firebaseService.getEmployees(),
          firebaseService.getWorkDays()
        ])
        
        const employees = employeesData as Employee[]
        const allWorkDays = workDaysData as WorkDay[]
        
        // Find the specific employee
        const foundEmployee = employees.find(emp => emp.id === employeeId)
        if (!foundEmployee) {
          setErrorMessage('Employee not found')
          setSyncStatus('error')
          return
        }
        
        setEmployee(foundEmployee)
        
        // Filter work days for this employee
        const employeeWorkDays = allWorkDays.filter(day => day.employeeId === employeeId)
        setWorkDays(employeeWorkDays)
        setSyncStatus('synced')
      } catch (error: any) {
        console.error('Error loading employee data:', error)
        setSyncStatus('error')
        setErrorMessage(error.message || 'Failed to load employee data')
      } finally {
        setLoading(false)
      }
    }

    if (employeeId) {
      loadEmployeeData()
    }
  }, [employeeId])

  // Set up real-time listeners
  useEffect(() => {
    if (!employeeId) return

    const unsubscribeEmployees = firebaseService.subscribeToEmployees(
      (employeesData) => {
        const employees = employeesData as Employee[]
        const foundEmployee = employees.find(emp => emp.id === employeeId)
        if (foundEmployee) {
          setEmployee(foundEmployee)
          setSyncStatus('synced')
          setErrorMessage('')
        }
      },
      (error: any) => {
        console.error('Employees subscription error:', error)
        setSyncStatus('error')
        setErrorMessage(`Employees sync error: ${error.message}`)
      }
    )

    const unsubscribeWorkDays = firebaseService.subscribeToWorkDays(
      (workDaysData) => {
        const allWorkDays = workDaysData as WorkDay[]
        const employeeWorkDays = allWorkDays.filter(day => day.employeeId === employeeId)
        setWorkDays(employeeWorkDays)
        setSyncStatus('synced')
        setErrorMessage('')
      },
      (error: any) => {
        console.error('Work days subscription error:', error)
        setSyncStatus('error')
        setErrorMessage(`Work days sync error: ${error.message}`)
      }
    )

    return () => {
      if (unsubscribeEmployees) unsubscribeEmployees()
      if (unsubscribeWorkDays) unsubscribeWorkDays()
    }
  }, [employeeId])

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

  const togglePayment = async (date: string) => {
    const existingDay = workDays.find(day => day.date === date)
    
    if (existingDay) {
      try {
        setSyncStatus('syncing')
        setErrorMessage('')
        const updatedWorkDay = { ...existingDay, paid: !existingDay.paid }
        await firebaseService.addWorkDay(updatedWorkDay)
      } catch (error: any) {
        console.error('Error updating payment:', error)
        setSyncStatus('error')
        setErrorMessage(`Failed to update payment: ${error.message}`)
      }
    }
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
    
    if (confirm(`Are you sure you want to delete ${employee.name}? This will also delete all their work records.`)) {
      try {
        setSyncStatus('syncing')
        setErrorMessage('')
        await Promise.all([
          firebaseService.deleteEmployee(employee.id),
          firebaseService.deleteWorkDaysForEmployee(employee.id)
        ])
        router.push('/')
      } catch (error: any) {
        console.error('Error deleting employee:', error)
        setSyncStatus('error')
        setErrorMessage(`Failed to delete employee: ${error.message}`)
      }
    }
  }

  const retryConnection = async () => {
    try {
      setSyncStatus('syncing')
      setErrorMessage('')
      await firebaseService.enableNetwork()
      
      // Reload data
      const [employeesData, workDaysData] = await Promise.all([
        firebaseService.getEmployees(),
        firebaseService.getWorkDays()
      ])
      
      const employees = employeesData as Employee[]
      const allWorkDays = workDaysData as WorkDay[]
      
      const foundEmployee = employees.find(emp => emp.id === employeeId)
      if (foundEmployee) {
        setEmployee(foundEmployee)
        const employeeWorkDays = allWorkDays.filter(day => day.employeeId === employeeId)
        setWorkDays(employeeWorkDays)
        setSyncStatus('synced')
      }
    } catch (error: any) {
      console.error('Error retrying connection:', error)
      setSyncStatus('error')
      setErrorMessage(`Connection failed: ${error.message}`)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-md">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">Loading employee data...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!employee) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-md">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-gray-800 mb-4">Employee Not Found</h1>
          <button
            onClick={() => router.push('/')}
            className="bg-primary text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors"
          >
            Back to Employees
          </button>
        </div>
      </div>
    )
  }

  const stats = calculateStats()

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
          onClick={() => router.push('/')}
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

      {/* Work History */}
      <div className="bg-white rounded-lg shadow-md p-6">
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
                  <div className="flex justify-between items-center mb-2">
                    <div>
                      <div className="font-medium text-gray-800">
                        {format(parseISO(workDay.date), 'EEEE, MMMM d, yyyy')}
                      </div>
                      <div className="text-sm text-gray-600">
                        {format(parseISO(workDay.date), 'MMM d, yyyy')}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-green-600">£{employee.dailyWage}</span>
                      <button
                        onClick={() => togglePayment(workDay.date)}
                        disabled={syncStatus === 'syncing'}
                        className={`px-3 py-1 rounded-md text-sm font-medium transition-colors disabled:opacity-50 ${
                          workDay.paid
                            ? 'bg-warning text-white'
                            : 'bg-primary text-white hover:bg-blue-600'
                        }`}
                      >
                        {workDay.paid ? '✓ Paid' : 'Mark Paid'}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Status:</span>
                    <span className={`font-medium ${workDay.paid ? 'text-green-600' : 'text-orange-600'}`}>
                      {workDay.paid ? 'Paid' : 'Unpaid'}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  )
} 