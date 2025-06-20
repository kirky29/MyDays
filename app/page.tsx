'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { firebaseService } from '../lib/firebase'

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

export default function Home() {
  const router = useRouter()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [workDays, setWorkDays] = useState<WorkDay[]>([])
  const [newEmployeeName, setNewEmployeeName] = useState('')
  const [newEmployeeWage, setNewEmployeeWage] = useState('')
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [loading, setLoading] = useState(true)
  const [syncStatus, setSyncStatus] = useState<'syncing' | 'synced' | 'error'>('syncing')
  const [errorMessage, setErrorMessage] = useState<string>('')

  // Load data from Firebase on component mount
  useEffect(() => {
    let isMounted = true

    const loadData = async () => {
      try {
        setLoading(true)
        setSyncStatus('syncing')
        setErrorMessage('')
        
        // Enable network connection
        await firebaseService.enableNetwork()
        
        // Load initial data
        const [employeesData, workDaysData] = await Promise.all([
          firebaseService.getEmployees(),
          firebaseService.getWorkDays()
        ])
        
        if (isMounted) {
          setEmployees(employeesData as Employee[])
          setWorkDays(workDaysData as WorkDay[])
          setSyncStatus('synced')
        }
      } catch (error: any) {
        console.error('Error loading data:', error)
        if (isMounted) {
          setSyncStatus('error')
          setErrorMessage(error.message || 'Failed to connect to database')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadData()

    return () => {
      isMounted = false
    }
  }, [])

  // Set up real-time listeners
  useEffect(() => {
    let isMounted = true

    const unsubscribeEmployees = firebaseService.subscribeToEmployees(
      (employeesData) => {
        if (isMounted) {
          setEmployees(employeesData as Employee[])
          setSyncStatus('synced')
          setErrorMessage('')
        }
      },
      (error: any) => {
        if (isMounted) {
          console.error('Employees subscription error:', error)
          setSyncStatus('error')
          setErrorMessage(`Employees sync error: ${error.message}`)
        }
      }
    )

    const unsubscribeWorkDays = firebaseService.subscribeToWorkDays(
      (workDaysData) => {
        if (isMounted) {
          setWorkDays(workDaysData as WorkDay[])
          setSyncStatus('synced')
          setErrorMessage('')
        }
      },
      (error: any) => {
        if (isMounted) {
          console.error('Work days subscription error:', error)
          setSyncStatus('error')
          setErrorMessage(`Work days sync error: ${error.message}`)
        }
      }
    )

    return () => {
      isMounted = false
      if (unsubscribeEmployees) unsubscribeEmployees()
      if (unsubscribeWorkDays) unsubscribeWorkDays()
    }
  }, [])

  const addEmployee = async () => {
    if (!newEmployeeName.trim() || !newEmployeeWage) return
    
    const employee: Employee = {
      id: Date.now().toString(),
      name: newEmployeeName.trim(),
      dailyWage: parseFloat(newEmployeeWage)
    }
    
    try {
      setSyncStatus('syncing')
      setErrorMessage('')
      await firebaseService.addEmployee(employee)
      setNewEmployeeName('')
      setNewEmployeeWage('')
    } catch (error: any) {
      console.error('Error adding employee:', error)
      setSyncStatus('error')
      setErrorMessage(`Failed to add employee: ${error.message}`)
    }
  }

  const deleteEmployee = async (id: string) => {
    try {
      setSyncStatus('syncing')
      setErrorMessage('')
      await Promise.all([
        firebaseService.deleteEmployee(id),
        firebaseService.deleteWorkDaysForEmployee(id)
      ])
    } catch (error: any) {
      console.error('Error deleting employee:', error)
      setSyncStatus('error')
      setErrorMessage(`Failed to delete employee: ${error.message}`)
    }
  }

  const toggleWorkDay = async (employeeId: string, date: string) => {
    const existingDay = workDays.find(day => day.employeeId === employeeId && day.date === date)
    
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

  const togglePayment = async (employeeId: string, date: string) => {
    const existingDay = workDays.find(day => day.employeeId === employeeId && day.date === date)
    
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

  const getWorkDay = (employeeId: string, date: string) => {
    return workDays.find(day => day.employeeId === employeeId && day.date === date)
  }

  const calculateEmployeeStats = (employeeId: string) => {
    const employee = employees.find(emp => emp.id === employeeId)
    if (!employee) return { totalWorked: 0, totalPaid: 0, totalOwed: 0, totalEarned: 0 }
    
    const workedDays = workDays.filter(day => 
      day.employeeId === employeeId && day.worked
    ).length
    
    const paidDays = workDays.filter(day => 
      day.employeeId === employeeId && day.paid
    ).length
    
    const totalEarned = workedDays * employee.dailyWage
    const totalPaid = paidDays * employee.dailyWage
    const totalOwed = totalEarned - totalPaid
    
    return { totalWorked: workedDays, totalPaid: paidDays, totalOwed, totalEarned }
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
      
      setEmployees(employeesData as Employee[])
      setWorkDays(workDaysData as WorkDay[])
      setSyncStatus('synced')
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
            <p className="text-gray-600">Loading your data...</p>
          </div>
        </div>
      </div>
    )
  }

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

      <h1 className="text-2xl font-bold text-center mb-6 text-gray-800">
        My Days - Work Tracker
      </h1>

      {/* Add Employee Section */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <h2 className="text-lg font-semibold mb-4 text-gray-700">Add Employee</h2>
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Employee Name"
            value={newEmployeeName}
            onChange={(e) => setNewEmployeeName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <input
            type="number"
            placeholder="Daily Wage (£)"
            value={newEmployeeWage}
            onChange={(e) => setNewEmployeeWage(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            onClick={addEmployee}
            disabled={syncStatus === 'syncing'}
            className="w-full bg-primary text-white py-2 px-4 rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {syncStatus === 'syncing' ? 'Adding...' : 'Add Employee'}
          </button>
        </div>
      </div>

      {/* Employee List */}
      {employees.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-700">Employees</h2>
          <div className="space-y-4">
            {employees.map(employee => {
              const stats = calculateEmployeeStats(employee.id)
              return (
                <div key={employee.id} className="border border-gray-200 rounded-lg p-4">
                  {/* Employee Header */}
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-800 text-lg">{employee.name}</h3>
                      <p className="text-sm text-gray-600">£{employee.dailyWage}/day</p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => router.push(`/employee/${employee.id}`)}
                        className="bg-primary text-white px-3 py-1 rounded-md text-sm hover:bg-blue-600 transition-colors"
                      >
                        View Details
                      </button>
                      <button
                        onClick={() => deleteEmployee(employee.id)}
                        disabled={syncStatus === 'syncing'}
                        className="text-danger hover:text-red-700 text-sm disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {/* Quick Stats */}
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <div className="text-center">
                      <div className="text-lg font-bold text-blue-600">{stats.totalWorked}</div>
                      <div className="text-xs text-gray-600">Days Worked</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-green-600">{stats.totalPaid}</div>
                      <div className="text-xs text-gray-600">Days Paid</div>
                    </div>
                    <div className="text-center">
                      <div className={`text-lg font-bold ${stats.totalOwed > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        £{stats.totalOwed.toFixed(0)}
                      </div>
                      <div className="text-xs text-gray-600">Outstanding</div>
                    </div>
                  </div>

                  {/* Financial Breakdown */}
                  <div className="bg-gray-50 rounded-lg p-3 text-sm">
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Earned:</span>
                        <span className="font-medium">£{stats.totalEarned.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Paid:</span>
                        <span className="font-medium text-green-600">£{(stats.totalPaid * employee.dailyWage).toFixed(2)}</span>
                      </div>
                      <div className="border-t pt-1 mt-1">
                        <div className="flex justify-between">
                          <span className="font-medium">Outstanding:</span>
                          <span className={`font-bold ${stats.totalOwed > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            £{stats.totalOwed.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Quick Work Day Tracker */}
      {employees.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-700">Quick Work Day Tracker</h2>
          
          {/* Date Selector */}
          <div className="mb-4">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Employee Work Status */}
          <div className="space-y-3">
            {employees.map(employee => {
              const workDay = getWorkDay(employee.id, selectedDate)
              return (
                <div key={employee.id} className="border border-gray-200 rounded-md p-3">
                  <h3 className="font-medium text-gray-800 mb-2">{employee.name}</h3>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => toggleWorkDay(employee.id, selectedDate)}
                      disabled={syncStatus === 'syncing'}
                      className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors disabled:opacity-50 ${
                        workDay?.worked
                          ? 'bg-secondary text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {workDay?.worked ? '✓ Worked' : 'Mark Worked'}
                    </button>
                    <button
                      onClick={() => togglePayment(employee.id, selectedDate)}
                      disabled={!workDay?.worked || syncStatus === 'syncing'}
                      className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors disabled:opacity-50 ${
                        workDay?.paid
                          ? 'bg-warning text-white'
                          : workDay?.worked
                          ? 'bg-primary text-white hover:bg-blue-600'
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      {workDay?.paid ? '✓ Paid' : 'Mark Paid'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Summary */}
      {employees.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-4">
          <h2 className="text-lg font-semibold mb-4 text-gray-700">Overall Summary</h2>
          <div className="space-y-2 text-sm">
            <p className="text-gray-600">Total Employees: {employees.length}</p>
            <p className="text-gray-600">
              Total Work Days: {workDays.filter(day => day.worked).length}
            </p>
            <p className="text-gray-600">
              Total Paid Days: {workDays.filter(day => day.paid).length}
            </p>
            <p className="font-medium text-gray-800">
              Total Outstanding: £{employees.reduce((total, emp) => {
                const stats = calculateEmployeeStats(emp.id)
                return total + stats.totalOwed
              }, 0).toFixed(2)}
            </p>
          </div>
        </div>
      )}
    </div>
  )
} 