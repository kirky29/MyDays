'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { format, parseISO, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addDays, subDays } from 'date-fns'
import { firebaseService, PAYMENT_TYPES } from '../../../lib/firebase'
import type { Payment } from '../../../lib/store'
import PaymentModal from '../../components/PaymentModal'
import PaymentEditModal from '../../components/PaymentEditModal'
import WorkDayEditModal from '../../components/WorkDayEditModal'
import BottomNavigation from '../../components/BottomNavigation'
import { useBodyScrollLock } from '../../../lib/hooks/useBodyScrollLock'

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
  customAmount?: number // Optional custom amount for this specific day
  notes?: string // Optional notes for this work day
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
  const [showEditModal, setShowEditModal] = useState(false)
  const [showPaymentEditModal, setShowPaymentEditModal] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null)
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [quickAddDate, setQuickAddDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [showWorkDayEditModal, setShowWorkDayEditModal] = useState(false)
  const [selectedWorkDay, setSelectedWorkDay] = useState<WorkDay | null>(null)

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

  const handleNavigate = (path: string) => {
    window.location.href = path
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
    if (!employee) return { totalWorked: 0, totalPaid: 0, totalOwed: 0, totalEarned: 0, actualPaidAmount: 0, isOverpaid: false, creditAmount: 0 }
    
    const workedDays = workDays.filter(day => day.worked)
    const paidDays = workDays.filter(day => day.paid)
    const unpaidDays = workDays.filter(day => day.worked && !day.paid)
    
    // Calculate actual amount paid from payment records
    const employeePayments = payments.filter(p => p.employeeId === employee.id)
    const actualPaidAmount = employeePayments.reduce((sum, payment) => sum + payment.amount, 0)
    
    // Calculate total earned based on wage change logic and custom amounts
    let totalEarned = 0
    
    for (const workDay of workedDays) {
      if (workDay.customAmount !== undefined) {
        // Use custom amount if specified
        totalEarned += workDay.customAmount
      } else {
        // Use wage logic
        if (employee.wageChangeDate && employee.previousWage && workDay.date < employee.wageChangeDate) {
          totalEarned += employee.previousWage
        } else {
          totalEarned += employee.dailyWage
        }
      }
    }
    
    // Outstanding = what should be earned - what was actually paid
    const totalOwed = totalEarned - actualPaidAmount
    const isOverpaid = totalOwed < 0
    const creditAmount = Math.abs(totalOwed)
    
    return { 
      totalWorked: workedDays.length, 
      totalPaid: paidDays.length, 
      totalOwed: Math.max(0, totalOwed), // Amount still owed (0 if overpaid)
      totalEarned,
      actualPaidAmount,
      isOverpaid,
      creditAmount // Amount overpaid (positive number)
    }
  }

  // Helper function to get the amount earned for a specific work day
  const getWorkDayAmount = (workDay: WorkDay) => {
    if (workDay.customAmount !== undefined) {
      return workDay.customAmount
    }
    if (employee?.wageChangeDate && employee.previousWage && workDay.date < employee.wageChangeDate) {
      return employee.previousWage
    }
    return employee?.dailyWage || 0
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

  const handlePaymentClick = (payment: Payment) => {
    setSelectedPayment(payment)
    setShowPaymentEditModal(true)
  }

  const handlePaymentUpdated = () => {
    // Data will be updated via real-time listeners
    setShowPaymentEditModal(false)
    setSelectedPayment(null)
  }

  const handleWorkDayClick = (workDay: WorkDay) => {
    setSelectedWorkDay(workDay)
    setShowWorkDayEditModal(true)
  }

  const handleWorkDayUpdated = () => {
    setShowWorkDayEditModal(false)
    setSelectedWorkDay(null)
  }

  const updateWorkDay = async (updatedWorkDay: WorkDay) => {
    try {
      setSyncStatus('syncing')
      setErrorMessage('')
      await firebaseService.addWorkDay(updatedWorkDay)
      setShowWorkDayEditModal(false)
      setSelectedWorkDay(null)
    } catch (error: any) {
      console.error('Error updating work day:', error)
      setSyncStatus('error')
      setErrorMessage(`Failed to update work day: ${error.message}`)
    }
  }

  const removeWorkDay = async (workDay: WorkDay) => {
    if (workDay.paid) {
      alert('Cannot remove a work day that has been paid. Please adjust the payment record first.')
      return
    }

    const confirmMessage = `Are you sure you want to remove this work day?\n\n${format(parseISO(workDay.date), 'EEEE, MMMM d, yyyy')}\n\nThis will remove the work day from records.`
    
    if (confirm(confirmMessage)) {
      try {
        setSyncStatus('syncing')
        setErrorMessage('')
        
        console.log('Removing work day:', workDay)
        
        // Mark as not worked and clear custom data to effectively "remove" it
        const removedWorkDay: WorkDay = {
          id: workDay.id,
          employeeId: workDay.employeeId,
          date: workDay.date,
          worked: false,
          paid: false
          // Intentionally omit customAmount and notes to remove them
        }
        
        console.log('Updated work day:', removedWorkDay)
        await firebaseService.addWorkDay(removedWorkDay)
        
        console.log('Work day removed successfully')
        setShowWorkDayEditModal(false)
        setSelectedWorkDay(null)
        
        // Show success message
        alert('Work day removed successfully!')
      } catch (error: any) {
        console.error('Error removing work day:', error)
        setSyncStatus('error')
        setErrorMessage(`Failed to remove work day: ${error.message}`)
        alert(`Failed to remove work day: ${error.message}`)
      }
    }
  }

  const updateEmployee = async (updatedEmployee: Employee, wageUpdateOption?: 'future' | 'all') => {
    try {
      setSyncStatus('syncing')
      setErrorMessage('')
      
      // If wage changed and we have work days, handle the wage change logic
      if (wageUpdateOption && updatedEmployee.dailyWage !== employee?.dailyWage) {
        await handleWageChange(updatedEmployee, wageUpdateOption)
      }
      
      // Update employee
      await firebaseService.addEmployee(updatedEmployee)
      
      setEmployee(updatedEmployee)
      setShowEditModal(false)
    } catch (error: any) {
      console.error('Error updating employee:', error)
      setSyncStatus('error')
      setErrorMessage(`Failed to update employee: ${error.message}`)
    }
  }

  const handleWageChange = async (updatedEmployee: Employee, option: 'future' | 'all') => {
    if (option === 'future') {
      // For "future only", we add a special field to track the wage change date
      // This allows us to apply different rates for work done before/after this date
      updatedEmployee.wageChangeDate = format(new Date(), 'yyyy-MM-dd')
      updatedEmployee.previousWage = employee?.dailyWage || updatedEmployee.dailyWage
      
      // Add note for clarity
      const wageChangeNote = `Wage changed from £${employee?.dailyWage}/day to £${updatedEmployee.dailyWage}/day on ${format(new Date(), 'MMM d, yyyy')}`
      updatedEmployee.notes = updatedEmployee.notes 
        ? `${updatedEmployee.notes}\n\n${wageChangeNote}`
        : wageChangeNote
    }
    // For 'all' option, we don't set wage change date - new wage applies to everything
  }



  const addWorkDaysRange = async (startDate: string, endDate: string) => {
    try {
      setSyncStatus('syncing')
      setErrorMessage('')
      
      const start = new Date(startDate)
      const end = new Date(endDate)
      const days = eachDayOfInterval({ start, end })
      
      const promises = days.map(async (day) => {
        const dateStr = format(day, 'yyyy-MM-dd')
        const existingDay = workDays.find(wd => wd.date === dateStr)
        
        if (!existingDay) {
          const newWorkDay: WorkDay = {
            id: `${employeeId}-${dateStr}`,
            employeeId,
            date: dateStr,
            worked: true,
            paid: false
          }
          return firebaseService.addWorkDay(newWorkDay)
        }
      })
      
      await Promise.all(promises.filter(Boolean))
    } catch (error: any) {
      console.error('Error adding work days range:', error)
      setSyncStatus('error')
      setErrorMessage(`Failed to add work days: ${error.message}`)
    }
  }

  const quickAddWorkDay = async () => {
    await toggleWorkDay(quickAddDate)
  }

  const getWeekDays = (weekStart: Date) => {
    return eachDayOfInterval({
      start: startOfWeek(weekStart, { weekStartsOn: 1 }), // Monday start
      end: endOfWeek(weekStart, { weekStartsOn: 1 })
    })
  }

  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentWeek(prev => 
      direction === 'prev' 
        ? subDays(prev, 7)
        : addDays(prev, 7)
    )
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
  const weekDays = getWeekDays(currentWeek)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50 pb-20 sm:pb-24">
      <div className="container mx-auto px-4 py-6 max-w-md">


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
      <div className="flex items-center justify-start mb-8">
        <button
          onClick={handleBackNavigation}
          className="inline-flex items-center px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all duration-200 group"
        >
          <svg className="w-4 h-4 mr-2 group-hover:-translate-x-0.5 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="font-medium">Back to Team</span>
        </button>
      </div>

      {/* Employee Info */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 mb-6">
        {/* Header Section */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
            <span className="text-white font-bold text-2xl">
              {employee.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">{employee.name}</h1>
          <div className="inline-flex items-center bg-blue-100 text-blue-700 px-4 py-2 rounded-xl font-semibold">
            £{employee.dailyWage}/day
          </div>
        </div>
        
        {/* Employee Details */}
        {(employee.email || employee.phone || employee.startDate || employee.notes) && (
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Contact & Info</h3>
            <div className="space-y-3">
              {employee.email && (
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                    </svg>
                  </div>
                  <span className="text-gray-700 text-sm">{employee.email}</span>
                </div>
              )}
              {employee.phone && (
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                  <span className="text-gray-700 text-sm">{employee.phone}</span>
                </div>
              )}
              {employee.startDate && (
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <span className="text-gray-700 text-sm">Started: {format(new Date(employee.startDate), 'MMM d, yyyy')}</span>
                </div>
              )}
              {employee.notes && (
                <div className="mt-4 p-3 bg-white rounded-lg border border-gray-200">
                  <div className="flex items-start space-x-2">
                    <svg className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                    </svg>
                    <p className="text-gray-700 text-sm leading-relaxed">{employee.notes}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4 text-center">
            <div className="text-2xl sm:text-3xl font-bold text-blue-600 mb-1">{stats.totalWorked}</div>
            <div className="text-sm font-medium text-blue-700">Days Worked</div>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-4 text-center">
            <div className="text-2xl sm:text-3xl font-bold text-green-600 mb-1">{stats.totalPaid}</div>
            <div className="text-sm font-medium text-green-700">Days Paid</div>
          </div>
        </div>
      </div>

      {/* Add Work Day */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6 mb-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-gray-900">Log Work Day</h2>
        </div>
        <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
          <input
            type="date"
            value={quickAddDate}
            onChange={(e) => setQuickAddDate(e.target.value)}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          />
          <button
            onClick={quickAddWorkDay}
            disabled={syncStatus === 'syncing'}
            className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 disabled:opacity-50 font-medium shadow-sm flex items-center justify-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Add Day</span>
          </button>
        </div>
      </div>

      {/* Weekly View */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6 mb-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-gray-900">Weekly View</h2>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => navigateWeek('prev')}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-sm font-medium text-gray-700 px-3 py-1 bg-gray-100 rounded-lg">
              {format(startOfWeek(currentWeek, { weekStartsOn: 1 }), 'MMM d')} - {format(endOfWeek(currentWeek, { weekStartsOn: 1 }), 'MMM d, yyyy')}
            </span>
            <button
              onClick={() => navigateWeek('next')}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
        
        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-2 mb-5">
          {weekDays.map((day) => {
            const dateStr = format(day, 'yyyy-MM-dd')
            const workDay = getWorkDay(dateStr)
            const isToday = isSameDay(day, new Date())
            
            return (
              <div key={dateStr} className="text-center">
                <div className="text-xs text-gray-500 mb-2 font-medium">
                  {format(day, 'EEE')}
                </div>
                <div className="relative">
                  {/* View-only day display */}
                  <div
                    className={`w-full h-12 rounded-xl flex flex-col items-center justify-center text-xs font-medium transition-all duration-200 ${
                      isToday ? 'ring-2 ring-blue-300' : ''
                    } ${
                      workDay?.worked && workDay?.paid
                        ? 'bg-green-100 text-green-700 border-2 border-green-300'
                        : workDay?.worked
                          ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
                          : 'bg-gray-50 text-gray-600 border-2 border-gray-200'
                    }`}
                  >
                    <div className="text-sm font-bold">{format(day, 'd')}</div>
                    {workDay?.worked && (
                      <div className="text-xs">
                        {workDay.paid ? '£' : '✓'}
                      </div>
                    )}
                  </div>
                  
                  {/* Edit button for worked days */}
                  {workDay?.worked ? (
                    <button
                      onClick={() => handleWorkDayClick(workDay)}
                      className="absolute inset-0 bg-transparent hover:bg-white/30 rounded-xl transition-colors z-10 group"
                      title="Edit work day details"
                    >
                      <div className="absolute top-1 right-1 w-4 h-4 bg-white rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <svg className="w-2 h-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </div>
                    </button>
                  ) : (
                    /* Add work day button for non-worked days */
                    <button
                      onClick={() => {
                        if (confirm(`Add work day for ${format(day, 'EEEE, MMMM d, yyyy')}?`)) {
                          toggleWorkDay(dateStr)
                        }
                      }}
                      disabled={syncStatus === 'syncing'}
                      className="absolute inset-0 bg-transparent hover:bg-blue-50 hover:border-blue-300 rounded-xl transition-colors z-10 group disabled:opacity-50"
                      title="Click to add work day"
                    >
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-6 h-6 bg-blue-100 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        </div>
                      </div>
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        
        {/* Legend */}
        <div className="flex justify-center items-center space-x-6 text-xs bg-gray-50 rounded-xl p-3">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-gray-200 border-2 border-gray-300 rounded"></div>
            <span className="text-gray-600 font-medium">Not worked</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-100 border-2 border-blue-300 rounded"></div>
            <span className="text-gray-600 font-medium">Worked</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-100 border-2 border-green-300 rounded"></div>
            <span className="text-gray-600 font-medium">Paid</span>
          </div>
        </div>
        
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500">
            <strong>Tip:</strong> Hover over days to add work • Click worked days to edit details
          </p>
        </div>
      </div>

      {/* Financial Summary */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 mb-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-gray-900">Financial Summary</h2>
        </div>
        
        {/* Overpayment Warning */}
        {stats.isOverpaid && (
          <div className="mb-6 p-4 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-xl">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <h4 className="font-semibold text-orange-800">Overpayment Detected</h4>
                <p className="text-sm text-orange-700 mt-1">
                  This employee has been paid £{stats.creditAmount.toFixed(2)} more than their current calculated earnings.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Financial Breakdown */}
        <div className="bg-gray-50 rounded-xl p-5 mb-6">
          <div className="space-y-4">
            <div className="flex justify-between items-center py-3 border-b border-gray-200">
              <span className="text-gray-700 font-medium">Total Earned</span>
              <span className="font-bold text-gray-900 text-lg">£{stats.totalEarned.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-gray-200">
              <span className="text-gray-700 font-medium">Total Paid</span>
              <span className="font-bold text-green-600 text-lg">£{stats.actualPaidAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center py-3">
              <span className="text-xl font-bold text-gray-900">
                {stats.isOverpaid ? 'In Credit:' : 'Outstanding:'}
              </span>
              <span className={`text-xl font-bold ${stats.isOverpaid ? 'text-blue-600' : stats.totalOwed > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                {stats.isOverpaid ? `£${stats.creditAmount.toFixed(2)}` : `£${stats.totalOwed.toFixed(2)}`}
              </span>
            </div>
          </div>
        </div>

        {/* Status Indicator */}
        <div className={`rounded-xl p-4 text-center ${
          stats.isOverpaid 
            ? 'bg-blue-50 border border-blue-200' 
            : stats.totalOwed > 0 
              ? 'bg-amber-50 border border-amber-200' 
              : 'bg-green-50 border border-green-200'
        }`}>
          <div className="flex items-center justify-center space-x-2">
            {stats.isOverpaid ? (
              <>
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                <span className="font-semibold text-blue-800">Employee has been overpaid</span>
              </>
            ) : stats.totalOwed > 0 ? (
              <>
                <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-semibold text-amber-800">Payment pending</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="font-semibold text-green-800">All payments up to date</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Bulk Payment Section */}
      {unpaidWorkDays.length > 0 && !stats.isOverpaid && (
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

      {/* Work Overview */}
      <WorkOverview 
        workDays={workDays}
        employee={employee}
        selectedWorkDays={selectedWorkDays}
        onToggleWorkDaySelection={toggleWorkDaySelection}
        onWorkDayClick={handleWorkDayClick}
        getWorkDayAmount={getWorkDayAmount}
      />

      {/* Payment History */}
      {payments.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Payment History</h2>
          <div className="space-y-4">
            {payments
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .map(payment => {
                // Get the work days that were paid in this payment
                const paidWorkDays = workDays.filter(wd => 
                  payment.workDayIds.includes(wd.id)
                ).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

                return (
                  <div 
                    key={payment.id} 
                    onClick={() => handlePaymentClick(payment)}
                    className="group border border-gray-200 rounded-lg p-4 bg-gradient-to-r from-green-50 to-emerald-50 cursor-pointer hover:shadow-md hover:from-green-100 hover:to-emerald-100 transition-all duration-200"
                  >
                    {/* Payment Header */}
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="font-semibold text-gray-800 text-lg">
                          £{payment.amount.toFixed(2)}
                        </div>
                        <div className="flex items-center space-x-2 mt-1">
                          <div className="flex items-center space-x-1">
                            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                            <span className="text-sm font-medium text-green-700">{payment.paymentType}</span>
                          </div>
                          <span className="text-gray-300">•</span>
                          <span className="text-sm text-gray-600">
                            Paid on {format(parseISO(payment.date), 'MMM d, yyyy')}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded-full">
                          {format(parseISO(payment.createdAt), 'MMM d, h:mm a')}
                        </span>
                        <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center opacity-70 group-hover:opacity-100 transition-opacity">
                          <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </div>
                      </div>
                    </div>

                    {/* Work Days Paid */}
                    <div className="mb-3">
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">
                        Work Days Paid ({paidWorkDays.length} day{paidWorkDays.length !== 1 ? 's' : ''})
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {paidWorkDays.map(workDay => (
                          <div key={workDay.id} className="bg-white rounded-lg p-3 border border-green-200">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium text-gray-800 text-sm">
                                  {format(parseISO(workDay.date), 'EEEE, MMM d')}
                                </div>
                                <div className="text-xs text-gray-600">
                                  {format(parseISO(workDay.date), 'yyyy')}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-semibold text-green-600">
                                  £{employee.dailyWage}
                                </div>
                                <div className="flex items-center space-x-1">
                                  <svg className="w-3 h-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                  <span className="text-xs text-green-600 font-medium">Paid</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Payment Notes */}
                    {payment.notes && (
                      <div className="bg-white rounded-lg p-3 border border-gray-200">
                        <div className="flex items-start space-x-2">
                          <svg className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                          </svg>
                          <div>
                            <span className="text-sm font-medium text-gray-700">Notes:</span>
                            <p className="text-sm text-gray-600 mt-1">{payment.notes}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Payment Summary */}
                    <div className="mt-3 pt-3 border-t border-green-200">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">
                          Total for {paidWorkDays.length} work day{paidWorkDays.length !== 1 ? 's' : ''}
                        </span>
                        <span className="font-semibold text-gray-900">
                          £{payment.amount.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      )}

      {/* Edit Employee Modal */}
      {showEditModal && employee && (
        <EditEmployeeModal
          employee={employee}
          onSave={updateEmployee}
          onClose={() => setShowEditModal(false)}
          workDays={workDays}
          payments={payments}
        />
      )}

      {/* Payment Modal */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        employee={employee}
        selectedWorkDays={selectedWorkDayObjects}
        onPaymentComplete={handlePaymentComplete}
      />

      {/* Payment Edit Modal */}
      {selectedPayment && (
        <PaymentEditModal
          isOpen={showPaymentEditModal}
          onClose={() => {
            setShowPaymentEditModal(false)
            setSelectedPayment(null)
          }}
          payment={selectedPayment}
          employee={employee}
          workDays={workDays}
          onPaymentUpdated={handlePaymentUpdated}
        />
      )}

      {/* Work Day Edit Modal */}
      {selectedWorkDay && (
        <WorkDayEditModal
          isOpen={showWorkDayEditModal}
          onClose={() => {
            setShowWorkDayEditModal(false)
            setSelectedWorkDay(null)
          }}
          workDay={selectedWorkDay}
          employee={employee}
          onWorkDayUpdated={updateWorkDay}
          onWorkDayRemoved={removeWorkDay}
          payments={payments}
        />
      )}

      {/* Employee Actions */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <div className="flex justify-center space-x-4 mb-6">
          <button
            onClick={() => setShowEditModal(true)}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-300 rounded-lg hover:bg-blue-100 hover:text-blue-700 transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit Details
          </button>
          <button
            onClick={deleteEmployee}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-300 rounded-lg hover:bg-red-100 hover:text-red-700 transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete
          </button>
        </div>
      </div>

      {/* Activity Log Link */}
      <div className="border-t border-gray-200 pt-6">
        <div className="text-center">
          <button
            onClick={() => window.location.href = '/activity-log'}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-600 bg-gray-50 border border-gray-300 rounded-lg hover:bg-gray-100 hover:text-gray-700 transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            View Activity Log
          </button>
          <p className="text-xs text-gray-500 mt-2">See all changes and activity across all employees</p>
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation onNavigate={handleNavigate} />
      </div>
    </div>
  )
}

// Work Overview Component
function WorkOverview({ 
  workDays, 
  employee, 
  selectedWorkDays, 
  onToggleWorkDaySelection,
  onWorkDayClick,
  getWorkDayAmount
}: {
  workDays: WorkDay[]
  employee: Employee
  selectedWorkDays: string[]
  onToggleWorkDaySelection: (workDayId: string) => void
  onWorkDayClick: (workDay: WorkDay) => void
  getWorkDayAmount: (workDay: WorkDay) => number
}) {
  const [expandedMonths, setExpandedMonths] = useState<string[]>([])
  
  const toggleMonth = (monthKey: string) => {
    setExpandedMonths(prev => 
      prev.includes(monthKey) 
        ? prev.filter(m => m !== monthKey)
        : [...prev, monthKey]
    )
  }

  // Group work days by month and separate past/future
  const today = new Date()
  const pastWorkDays = workDays.filter(day => new Date(day.date) < today)
  const futureWorkDays = workDays.filter(day => new Date(day.date) >= today)

  // Group past work days by month
  const groupedPastWork = pastWorkDays.reduce((groups, workDay) => {
    const monthKey = format(parseISO(workDay.date), 'yyyy-MM')
    const monthLabel = format(parseISO(workDay.date), 'MMMM yyyy')
    
    if (!groups[monthKey]) {
      groups[monthKey] = {
        label: monthLabel,
        days: [],
        worked: 0,
        paid: 0,
        earned: 0,
        paidAmount: 0
      }
    }
    
    groups[monthKey].days.push(workDay)
    if (workDay.worked) {
      groups[monthKey].worked++
      const dayAmount = getWorkDayAmount(workDay)
      groups[monthKey].earned += dayAmount
      if (workDay.paid) {
        groups[monthKey].paid++
        groups[monthKey].paidAmount += dayAmount
      }
    }
    
    return groups
  }, {} as Record<string, {
    label: string
    days: WorkDay[]
    worked: number
    paid: number
    earned: number
    paidAmount: number
  }>)

  // Sort months by date (most recent first)
  const sortedMonths = Object.entries(groupedPastWork).sort(([a], [b]) => b.localeCompare(a))

  if (workDays.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">Work Overview</h2>
        <p className="text-gray-500 text-center py-8">No work days recorded yet.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-lg font-semibold text-gray-700 mb-6">Work Overview</h2>
      
      {/* Future/Upcoming Work */}
      {futureWorkDays.length > 0 && (
        <div className="mb-6">
          <h3 className="text-md font-semibold text-blue-700 mb-3 flex items-center">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Upcoming Work ({futureWorkDays.length} days)
          </h3>
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="grid grid-cols-1 gap-2">
              {futureWorkDays
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                .slice(0, 5) // Show only next 5 future days
                .map(workDay => (
                  <div key={workDay.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">
                      {format(parseISO(workDay.date), 'EEE, MMM d')}
                    </span>
                    <span className="text-blue-600 font-medium">
                      {workDay.worked ? 'Completed' : 'Scheduled'}
                    </span>
                  </div>
                ))}
              {futureWorkDays.length > 5 && (
                <div className="text-xs text-blue-600 font-medium text-center mt-2">
                  +{futureWorkDays.length - 5} more scheduled days
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Past Work History */}
      {sortedMonths.length > 0 && (
        <div>
          <h3 className="text-md font-semibold text-gray-700 mb-3 flex items-center">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Work History
          </h3>
          <div className="space-y-3">
            {sortedMonths.map(([monthKey, monthData]) => {
              const isExpanded = expandedMonths.includes(monthKey)
              const outstanding = monthData.earned - monthData.paidAmount
              
              return (
                <div key={monthKey} className="border border-gray-200 rounded-lg overflow-hidden">
                  {/* Month Header */}
                  <button
                    onClick={() => toggleMonth(monthKey)}
                    className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <svg className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        <span className="font-medium text-gray-800">{monthData.label}</span>
                      </div>
                      <div className="flex items-center space-x-4 text-sm">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <span className="text-gray-600">{monthData.worked} worked</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-gray-600">{monthData.paid} paid</span>
                        </div>
                        <div className={`font-semibold ${outstanding > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                          {outstanding > 0 ? `£${outstanding.toFixed(0)} owed` : 'All paid'}
                        </div>
                      </div>
                    </div>
                  </button>

                  {/* Month Details */}
                  {isExpanded && (
                    <div className="p-4 bg-white">
                      <div className="space-y-2">
                        {monthData.days
                          .filter(day => day.worked)
                          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                          .map(workDay => (
                            <div key={workDay.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors">
                              <div className="flex items-center space-x-3">
                                <input
                                  type="checkbox"
                                  checked={selectedWorkDays.includes(workDay.id)}
                                  onChange={() => onToggleWorkDaySelection(workDay.id)}
                                  disabled={workDay.paid}
                                  className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                                />
                                <div 
                                  onClick={() => onWorkDayClick(workDay)}
                                  className="cursor-pointer hover:text-blue-600 transition-colors flex-1"
                                >
                                  <div className="font-medium text-gray-800 text-sm flex items-center space-x-2">
                                    <span>{format(parseISO(workDay.date), 'EEEE, d')}</span>
                                    {workDay.notes && (
                                      <svg className="w-3 h-3 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                                      </svg>
                                    )}
                                    {workDay.customAmount !== undefined && (
                                      <span className="text-xs bg-blue-100 text-blue-800 px-1 rounded">Custom</span>
                                    )}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {format(parseISO(workDay.date), 'MMM d, yyyy')}
                                    {workDay.notes && (
                                      <span className="ml-2 text-blue-600 truncate max-w-20">"{workDay.notes}"</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className={`text-sm font-medium ${workDay.customAmount !== undefined ? 'text-blue-600' : 'text-green-600'}`}>
                                  £{getWorkDayAmount(workDay).toFixed(2)}
                                </span>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  workDay.paid 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-orange-100 text-orange-800'
                                }`}>
                                  {workDay.paid ? 'Paid' : 'Unpaid'}
                                </span>
                              </div>
                            </div>
                          ))}
                      </div>
                      
                      {/* Month Summary */}
                      <div className="mt-4 pt-3 border-t border-gray-200">
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div className="text-center">
                            <div className="font-semibold text-blue-600">{monthData.worked}</div>
                            <div className="text-gray-600 text-xs">Days Worked</div>
                          </div>
                          <div className="text-center">
                            <div className="font-semibold text-green-600">£{monthData.earned.toFixed(0)}</div>
                            <div className="text-gray-600 text-xs">Total Earned</div>
                          </div>
                          <div className="text-center">
                            <div className={`font-semibold ${outstanding > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                              £{outstanding.toFixed(0)}
                            </div>
                            <div className="text-gray-600 text-xs">Outstanding</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* No work history message */}
      {sortedMonths.length === 0 && futureWorkDays.length === 0 && (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">No Work History</h3>
          <p className="text-gray-600 text-sm">Work days will appear here once they're logged</p>
        </div>
      )}
    </div>
  )
}



// Edit Employee Modal Component
function EditEmployeeModal({ 
  employee, 
  onSave, 
  onClose,
  workDays,
  payments
}: { 
  employee: Employee
  onSave: (employee: Employee, wageUpdateOption?: 'future' | 'all') => void
  onClose: () => void
  workDays: WorkDay[]
  payments: Payment[]
}) {
  const [formData, setFormData] = useState<Employee>(employee)
  const [showWageOptions, setShowWageOptions] = useState(false)
  const [wageUpdateOption, setWageUpdateOption] = useState<'future' | 'all'>('future')
  
  // Prevent background scrolling when modal is open
  useBodyScrollLock(true)

  const hasWageChanged = formData.dailyWage !== employee.dailyWage
  const hasWorkedDays = workDays.some(day => day.worked)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (hasWageChanged && hasWorkedDays) {
      setShowWageOptions(true)
    } else {
      onSave(formData)
    }
  }

  const handleWageUpdateConfirm = () => {
    onSave(formData, wageUpdateOption)
    setShowWageOptions(false)
  }

  const calculateImpact = () => {
    const workedDays = workDays.filter(day => day.worked)
    const oldWage = employee.dailyWage
    const newWage = formData.dailyWage
    const wageDifference = newWage - oldWage
    
    return {
      totalDays: workedDays.length,
      oldTotal: workedDays.length * oldWage,
      newTotal: workedDays.length * newWage,
      difference: workedDays.length * wageDifference,
      isIncrease: wageDifference > 0
    }
  }

  const impact = hasWageChanged ? calculateImpact() : null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 pt-8 border-b">
          <h2 className="text-xl font-semibold text-gray-800">
            {showWageOptions ? 'Wage Update Options' : 'Edit Employee Details'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {!showWageOptions ? (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Daily Wage (£)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.dailyWage ?? ''}
                onChange={(e) => setFormData(prev => ({ ...prev, dailyWage: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
              <p className="text-xs text-gray-600 mt-1">£0 allowed for volunteers/unpaid work</p>
              {hasWageChanged && impact && (
                <div className={`mt-2 p-3 rounded-lg ${impact.isIncrease ? 'bg-green-50 border border-green-200' : 'bg-orange-50 border border-orange-200'}`}>
                  <div className="flex items-center space-x-2">
                    <svg className={`w-4 h-4 ${impact.isIncrease ? 'text-green-600' : 'text-orange-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={impact.isIncrease ? "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" : "M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"} />
                    </svg>
                    <span className={`text-sm font-medium ${impact.isIncrease ? 'text-green-800' : 'text-orange-800'}`}>
                      {impact.isIncrease ? 'Pay Rise' : 'Pay Decrease'} Detected
                    </span>
                  </div>
                  <p className={`text-xs mt-1 ${impact.isIncrease ? 'text-green-700' : 'text-orange-700'}`}>
                    {impact.totalDays} worked days will be affected. You'll choose how to apply this change next.
                  </p>
                </div>
              )}
            </div>



            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
              <textarea
                value={formData.notes || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value || undefined }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                placeholder="Any additional notes about this employee..."
              />
            </div>

            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-primary text-white rounded-md hover:bg-blue-600 transition-colors"
              >
                {hasWageChanged && hasWorkedDays ? 'Continue' : 'Save Changes'}
              </button>
            </div>
          </form>
        ) : (
          <div className="p-6">
            {impact && (
              <>
                <div className="mb-6">
                  <div className={`p-4 rounded-lg ${impact.isIncrease ? 'bg-green-50' : 'bg-orange-50'}`}>
                    <h3 className={`font-semibold ${impact.isIncrease ? 'text-green-800' : 'text-orange-800'}`}>
                      {impact.isIncrease ? 'Pay Rise' : 'Pay Decrease'} Impact
                    </h3>
                    <div className="mt-3 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Previous wage:</span>
                        <span className="font-medium">£{employee.dailyWage}/day</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">New wage:</span>
                        <span className="font-medium">£{formData.dailyWage}/day</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Worked days:</span>
                        <span className="font-medium">{impact.totalDays} days</span>
                      </div>
                      <div className="border-t pt-2 mt-2">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Impact:</span>
                          <span className={`font-bold ${impact.isIncrease ? 'text-green-600' : 'text-orange-600'}`}>
                            {impact.isIncrease ? '+' : ''}£{impact.difference.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                                <div className="space-y-4">
                   <h3 className="font-semibold text-gray-800">How should this wage change be applied?</h3>
                   
                   <div className="space-y-3">
                     <label className="flex items-start space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                       <input
                         type="radio"
                         name="wageOption"
                         value="future"
                         checked={wageUpdateOption === 'future'}
                         onChange={(e) => setWageUpdateOption(e.target.value as 'future' | 'all')}
                         className="mt-1 w-4 h-4 text-primary border-gray-300 focus:ring-primary"
                       />
                       <div className="flex-1">
                         <div className="font-medium text-gray-800">Apply to Future Work Only</div>
                         <div className="text-sm text-gray-600 mt-1">
                           Only future work will use the new wage rate. Past work calculations remain at the rate when it was done.
                         </div>
                         <div className="text-xs text-blue-600 mt-2 font-medium">
                           Recommended for pay rises
                         </div>
                       </div>
                     </label>

                     <label className="flex items-start space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                       <input
                         type="radio"
                         name="wageOption"
                         value="all"
                         checked={wageUpdateOption === 'all'}
                         onChange={(e) => setWageUpdateOption(e.target.value as 'future' | 'all')}
                         className="mt-1 w-4 h-4 text-primary border-gray-300 focus:ring-primary"
                       />
                       <div className="flex-1">
                         <div className="font-medium text-gray-800">Apply to All Work (Retroactive)</div>
                         <div className="text-sm text-gray-600 mt-1">
                           Recalculate outstanding amounts for all work using the new wage. Existing payments remain unchanged.
                         </div>
                         <div className={`text-xs mt-2 font-medium ${impact.isIncrease ? 'text-green-600' : 'text-orange-600'}`}>
                           {impact.isIncrease ? 'Will increase' : 'Will decrease'} total outstanding amount
                         </div>
                       </div>
                     </label>
                   </div>

                   <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                     <div className="flex items-start space-x-2">
                       <svg className="w-4 h-4 text-yellow-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
                       </svg>
                       <div>
                         <span className="text-sm font-medium text-yellow-800">Important:</span>
                         <p className="text-xs text-yellow-700 mt-1">Existing payment records never change to maintain financial integrity.</p>
                       </div>
                     </div>
                   </div>
                 </div>

                <div className="flex space-x-3 pt-6">
                  <button
                    type="button"
                    onClick={() => setShowWageOptions(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleWageUpdateConfirm}
                    className="flex-1 px-4 py-2 bg-primary text-white rounded-md hover:bg-blue-600 transition-colors"
                  >
                    Apply Changes
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
} 