'use client'

import { useState, useEffect } from 'react'
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
  const [employees, setEmployees] = useState<Employee[]>([])
  const [workDays, setWorkDays] = useState<WorkDay[]>([])
  const [newEmployeeName, setNewEmployeeName] = useState('')
  const [newEmployeeWage, setNewEmployeeWage] = useState('')
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [loading, setLoading] = useState(true)
  const [syncStatus, setSyncStatus] = useState<'syncing' | 'synced' | 'error'>('syncing')

  // Load data from Firebase on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        setSyncStatus('syncing')
        
        // Load initial data
        const [employeesData, workDaysData] = await Promise.all([
          firebaseService.getEmployees(),
          firebaseService.getWorkDays()
        ])
        
        setEmployees(employeesData as Employee[])
        setWorkDays(workDaysData as WorkDay[])
        setSyncStatus('synced')
      } catch (error) {
        console.error('Error loading data:', error)
        setSyncStatus('error')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  // Set up real-time listeners
  useEffect(() => {
    const unsubscribeEmployees = firebaseService.subscribeToEmployees((employeesData) => {
      setEmployees(employeesData as Employee[])
      setSyncStatus('synced')
    })

    const unsubscribeWorkDays = firebaseService.subscribeToWorkDays((workDaysData) => {
      setWorkDays(workDaysData as WorkDay[])
      setSyncStatus('synced')
    })

    return () => {
      unsubscribeEmployees()
      unsubscribeWorkDays()
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
      await firebaseService.addEmployee(employee)
      setNewEmployeeName('')
      setNewEmployeeWage('')
    } catch (error) {
      console.error('Error adding employee:', error)
      setSyncStatus('error')
    }
  }

  const deleteEmployee = async (id: string) => {
    try {
      setSyncStatus('syncing')
      await Promise.all([
        firebaseService.deleteEmployee(id),
        firebaseService.deleteWorkDaysForEmployee(id)
      ])
    } catch (error) {
      console.error('Error deleting employee:', error)
      setSyncStatus('error')
    }
  }

  const toggleWorkDay = async (employeeId: string, date: string) => {
    const existingDay = workDays.find(day => day.employeeId === employeeId && day.date === date)
    
    try {
      setSyncStatus('syncing')
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
    } catch (error) {
      console.error('Error updating work day:', error)
      setSyncStatus('error')
    }
  }

  const togglePayment = async (employeeId: string, date: string) => {
    const existingDay = workDays.find(day => day.employeeId === employeeId && day.date === date)
    
    if (existingDay) {
      try {
        setSyncStatus('syncing')
        const updatedWorkDay = { ...existingDay, paid: !existingDay.paid }
        await firebaseService.addWorkDay(updatedWorkDay)
      } catch (error) {
        console.error('Error updating payment:', error)
        setSyncStatus('error')
      }
    }
  }

  const getWorkDay = (employeeId: string, date: string) => {
    return workDays.find(day => day.employeeId === employeeId && day.date === date)
  }

  const calculateTotalEarnings = (employeeId: string) => {
    const employee = employees.find(emp => emp.id === employeeId)
    if (!employee) return 0
    
    const workedDays = workDays.filter(day => 
      day.employeeId === employeeId && day.worked
    ).length
    
    return workedDays * employee.dailyWage
  }

  const calculateTotalPaid = (employeeId: string) => {
    const employee = employees.find(emp => emp.id === employeeId)
    if (!employee) return 0
    
    const paidDays = workDays.filter(day => 
      day.employeeId === employeeId && day.paid
    ).length
    
    return paidDays * employee.dailyWage
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
            placeholder="Daily Wage ($)"
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
          <div className="space-y-3">
            {employees.map(employee => (
              <div key={employee.id} className="border border-gray-200 rounded-md p-3">
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <h3 className="font-medium text-gray-800">{employee.name}</h3>
                    <p className="text-sm text-gray-600">${employee.dailyWage}/day</p>
                  </div>
                  <button
                    onClick={() => deleteEmployee(employee.id)}
                    disabled={syncStatus === 'syncing'}
                    className="text-danger hover:text-red-700 text-sm disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
                <div className="text-sm text-gray-600">
                  <p>Total Earned: ${calculateTotalEarnings(employee.id).toFixed(2)}</p>
                  <p>Total Paid: ${calculateTotalPaid(employee.id).toFixed(2)}</p>
                  <p className="font-medium">
                    Outstanding: ${(calculateTotalEarnings(employee.id) - calculateTotalPaid(employee.id)).toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Work Day Tracker */}
      {employees.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-700">Work Day Tracker</h2>
          
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
          <h2 className="text-lg font-semibold mb-4 text-gray-700">Summary</h2>
          <div className="space-y-2 text-sm">
            <p className="text-gray-600">Total Employees: {employees.length}</p>
            <p className="text-gray-600">
              Total Work Days: {workDays.filter(day => day.worked).length}
            </p>
            <p className="text-gray-600">
              Total Paid Days: {workDays.filter(day => day.paid).length}
            </p>
            <p className="font-medium text-gray-800">
              Total Outstanding: ${employees.reduce((total, emp) => 
                total + (calculateTotalEarnings(emp.id) - calculateTotalPaid(emp.id)), 0
              ).toFixed(2)}
            </p>
          </div>
        </div>
      )}
    </div>
  )
} 