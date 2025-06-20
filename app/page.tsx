'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { firebaseService } from '../lib/firebase'
import ReportModal from './components/ReportModal'

interface Employee {
  id: string
  name: string
  dailyWage: number
  email?: string
  phone?: string
  startDate?: string
  notes?: string
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
  const [searchTerm, setSearchTerm] = useState('')
  const [showReportModal, setShowReportModal] = useState(false)
  const [payments, setPayments] = useState<any[]>([])

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
        const [employeesData, workDaysData, paymentsData] = await Promise.all([
          firebaseService.getEmployees(),
          firebaseService.getWorkDays(),
          firebaseService.getPayments()
        ])
        
        if (isMounted) {
          setEmployees(employeesData as Employee[])
          setWorkDays(workDaysData as WorkDay[])
          setPayments(paymentsData as any[])
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

    const unsubscribePayments = firebaseService.subscribeToPayments(
      (paymentsData) => {
        if (isMounted) {
          setPayments(paymentsData as any[])
          setSyncStatus('synced')
          setErrorMessage('')
        }
      },
      (error: any) => {
        if (isMounted) {
          console.error('Payments subscription error:', error)
          setSyncStatus('error')
          setErrorMessage(`Payments sync error: ${error.message}`)
        }
      }
    )

    return () => {
      isMounted = false
      if (unsubscribeEmployees) unsubscribeEmployees()
      if (unsubscribeWorkDays) unsubscribeWorkDays()
      if (unsubscribePayments) unsubscribePayments()
    }
  }, [])

  const addEmployee = async () => {
    if (!newEmployeeName.trim() || !newEmployeeWage) return
    
    const employeeId = Date.now().toString()
    const employee: Employee = {
      id: employeeId,
      name: newEmployeeName.trim(),
      dailyWage: parseFloat(newEmployeeWage),
      startDate: format(new Date(), 'yyyy-MM-dd')
    }
    
    try {
      setSyncStatus('syncing')
      setErrorMessage('')
      await firebaseService.addEmployee(employee)
      setNewEmployeeName('')
      setNewEmployeeWage('')
      
      // Auto-navigate to the new employee's profile
      setTimeout(() => {
        window.location.href = `/employee/${employeeId}`
      }, 500) // Small delay to ensure the employee is saved
      
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
      const [employeesData, workDaysData, paymentsData] = await Promise.all([
        firebaseService.getEmployees(),
        firebaseService.getWorkDays(),
        firebaseService.getPayments()
      ])
      
      setEmployees(employeesData as Employee[])
      setWorkDays(workDaysData as WorkDay[])
      setPayments(paymentsData as any[])
      setSyncStatus('synced')
    } catch (error: any) {
      console.error('Error retrying connection:', error)
      setSyncStatus('error')
      setErrorMessage(`Connection failed: ${error.message}`)
    }
  }

  const navigateToEmployee = (employeeId: string) => {
    // Use window.location for clean navigation
    window.location.href = `/employee/${employeeId}`
  }

  const navigateToAddEmployee = () => {
    window.location.href = '/add-employee'
  }

  // Filter employees based on search term
  const filteredEmployees = employees.filter(employee =>
    employee.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 py-8 max-w-md">
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <div className="relative">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto mb-6"></div>
                <div className="absolute inset-0 rounded-full h-16 w-16 border-4 border-transparent border-t-blue-400 animate-ping mx-auto"></div>
              </div>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Loading Your Workspace</h2>
              <p className="text-gray-600">Setting up your work tracking dashboard...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="container mx-auto px-4 py-6 max-w-md">
        {/* Sync Status Indicator - Modern Design */}
        <div className="mb-6 flex items-center justify-center">
          <div className={`flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium backdrop-blur-sm ${
            syncStatus === 'syncing' ? 'bg-amber-100/80 text-amber-800 border border-amber-200' :
            syncStatus === 'synced' ? 'bg-emerald-100/80 text-emerald-800 border border-emerald-200' :
            'bg-red-100/80 text-red-800 border border-red-200'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              syncStatus === 'syncing' ? 'bg-amber-500 animate-pulse' :
              syncStatus === 'synced' ? 'bg-emerald-500' :
              'bg-red-500'
            }`}></div>
            <span>
              {syncStatus === 'syncing' ? 'Syncing...' :
               syncStatus === 'synced' ? 'All Synced' :
               'Sync Error'}
            </span>
          </div>
        </div>

        {/* Error Message - Enhanced Design */}
        {errorMessage && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                  <svg className="h-5 w-5 text-red-600" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-semibold text-red-800">Connection Issue</h3>
                <p className="mt-1 text-sm text-red-700">{errorMessage}</p>
                <button
                  onClick={retryConnection}
                  className="mt-3 inline-flex items-center px-3 py-1.5 border border-red-300 text-sm font-medium rounded-lg text-red-700 bg-red-50 hover:bg-red-100 transition-colors"
                >
                  <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Retry Connection
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Header Section - Modern Hero */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            My Days
          </h1>
          <p className="text-gray-600 mb-6">
            Track work, manage payments, and stay organized
          </p>
          
          {/* Action Bar */}
          <div className="flex items-center justify-center space-x-3">
            <button
              onClick={() => setShowReportModal(true)}
              className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition-all duration-200"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Reports
            </button>
            
            {employees.length > 0 && (
              <div className="flex items-center text-sm text-gray-500">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                {employees.length} employee{employees.length !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        </div>

        {/* Business Overview - Moved Above Employees */}
        {employees.length > 0 && (
          <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl shadow-lg p-6 text-white mb-6">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold">Business Overview</h2>
                <p className="text-white/80 text-sm">Your workspace at a glance</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/10 rounded-xl p-4">
                <div className="text-2xl font-bold mb-1">{employees.length}</div>
                <div className="text-white/80 text-sm">Total Employees</div>
              </div>
              <div className="bg-white/10 rounded-xl p-4">
                <div className="text-2xl font-bold mb-1">{workDays.filter(day => day.worked).length}</div>
                <div className="text-white/80 text-sm">Work Days Logged</div>
              </div>
              <div className="bg-white/10 rounded-xl p-4">
                <div className="text-2xl font-bold mb-1">{workDays.filter(day => day.paid).length}</div>
                <div className="text-white/80 text-sm">Days Paid</div>
              </div>
              <div className="bg-white/10 rounded-xl p-4">
                <div className="text-2xl font-bold mb-1 text-yellow-400">
                  £{employees.reduce((total, emp) => {
                    const stats = calculateEmployeeStats(emp.id)
                    return total + stats.totalOwed
                  }, 0).toFixed(0)}
                </div>
                <div className="text-white/80 text-sm">Outstanding</div>
              </div>
            </div>
          </div>
        )}

        {/* Employee List - Modern Cards (No Search, No Delete) */}
        {filteredEmployees.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Your Team</h2>
            </div>
            
            <div className="space-y-4">
              {filteredEmployees.map(employee => {
                const stats = calculateEmployeeStats(employee.id)
                return (
                  <div key={employee.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all duration-200">
                    {/* Employee Header */}
                    <div className="p-5 pb-4">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                            <span className="text-white font-semibold text-lg">
                              {employee.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900 text-lg">{employee.name}</h3>
                            <p className="text-sm text-gray-600">£{employee.dailyWage}/day</p>
                            {employee.startDate && (
                              <p className="text-xs text-gray-500">
                                Started {format(new Date(employee.startDate), 'MMM d, yyyy')}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex space-x-2">
                          <button
                            onClick={() => navigateToEmployee(employee.id)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
                          >
                            View Profile
                          </button>
                        </div>
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-3 gap-4">
                        <div className="bg-blue-50 rounded-xl p-3 text-center">
                          <div className="text-2xl font-bold text-blue-600">{stats.totalWorked}</div>
                          <div className="text-xs text-blue-800 font-medium">Days Worked</div>
                        </div>
                        <div className="bg-green-50 rounded-xl p-3 text-center">
                          <div className="text-2xl font-bold text-green-600">{stats.totalPaid}</div>
                          <div className="text-xs text-green-800 font-medium">Days Paid</div>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-3 text-center">
                          <div className={`text-2xl font-bold ${stats.totalOwed > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            £{stats.totalOwed.toFixed(0)}
                          </div>
                          <div className="text-xs text-gray-600 font-medium">Outstanding</div>
                        </div>
                      </div>
                    </div>

                    {/* Financial Summary */}
                    <div className="bg-gray-50 px-5 py-4">
                      <div className="flex justify-between items-center text-sm">
                        <div className="flex space-x-4">
                          <span className="text-gray-600">
                            Earned: <span className="font-medium text-gray-900">£{stats.totalEarned.toFixed(2)}</span>
                          </span>
                          <span className="text-gray-600">
                            Paid: <span className="font-medium text-green-600">£{(stats.totalPaid * employee.dailyWage).toFixed(2)}</span>
                          </span>
                        </div>
                        <div className={`font-semibold ${stats.totalOwed > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {stats.totalOwed > 0 ? `£${stats.totalOwed.toFixed(2)} owed` : 'All paid up!'}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Empty State - When no employees */}
        {employees.length === 0 && (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No employees yet</h3>
            <p className="text-gray-600 mb-6">Add your first employee to start tracking work days and payments</p>
            <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-bold text-xs">1</span>
              </div>
              <span>Add employee</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-bold text-xs">2</span>
              </div>
              <span>Set up profile</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-bold text-xs">3</span>
              </div>
              <span>Track work</span>
            </div>
          </div>
        )}

        {/* Quick Work Day Tracker - Enhanced */}
        {filteredEmployees.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Quick Work Tracker</h2>
                <p className="text-sm text-gray-600">Mark work days for {format(new Date(selectedDate), 'EEEE, MMM d')}</p>
              </div>
            </div>
            
            {/* Date Selector */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              />
            </div>

            {/* Employee Work Status */}
            <div className="space-y-3">
              {filteredEmployees.map(employee => {
                const workDay = getWorkDay(employee.id, selectedDate)
                return (
                  <div key={employee.id} className="border border-gray-200 rounded-xl p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                          <span className="text-white font-semibold text-sm">
                            {employee.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">{employee.name}</h3>
                          <p className="text-sm text-gray-600">£{employee.dailyWage}/day</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => toggleWorkDay(employee.id, selectedDate)}
                        disabled={syncStatus === 'syncing'}
                        className={`py-2.5 px-4 rounded-xl text-sm font-medium transition-all duration-200 disabled:opacity-50 ${
                          workDay?.worked
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {workDay?.worked ? (
                          <div className="flex items-center justify-center">
                            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Worked
                          </div>
                        ) : (
                          'Mark Worked'
                        )}
                      </button>
                      
                      <button
                        onClick={() => togglePayment(employee.id, selectedDate)}
                        disabled={!workDay?.worked || syncStatus === 'syncing'}
                        className={`py-2.5 px-4 rounded-xl text-sm font-medium transition-all duration-200 disabled:opacity-50 ${
                          workDay?.paid
                            ? 'bg-green-600 text-white shadow-sm'
                            : workDay?.worked
                            ? 'bg-amber-500 text-white hover:bg-amber-600'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        {workDay?.paid ? (
                          <div className="flex items-center justify-center">
                            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                            </svg>
                            Paid
                          </div>
                        ) : workDay?.worked ? (
                          'Mark Paid'
                        ) : (
                          'Not Available'
                        )}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Add Employee Button - Moved to Bottom */}
        <div className="text-center py-6">
          <button
            onClick={navigateToAddEmployee}
            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            Add New Employee
          </button>
        </div>

        {/* Report Modal */}
        <ReportModal
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          employees={employees}
          workDays={workDays}
          payments={payments}
        />
      </div>
    </div>
  )
} 