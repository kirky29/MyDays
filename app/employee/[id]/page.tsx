'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { format, parseISO, isSameDay, eachDayOfInterval } from 'date-fns'
import { firebaseService, PAYMENT_TYPES } from '../../../lib/firebase'
import type { Payment } from '../../../lib/store'
import PaymentModal from '../../components/PaymentModal'
import PaymentEditModal from '../../components/PaymentEditModal'
import WorkDayEditModal from '../../components/WorkDayEditModal'

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
  const router = useRouter()
  const employeeId = params.id as string
  
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [workDays, setWorkDays] = useState<WorkDay[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [syncStatus, setSyncStatus] = useState<'syncing' | 'synced' | 'error'>('syncing')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showPaymentEditModal, setShowPaymentEditModal] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null)
  const [quickAddDate, setQuickAddDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [showWorkDayEditModal, setShowWorkDayEditModal] = useState(false)
  const [selectedWorkDay, setSelectedWorkDay] = useState<WorkDay | null>(null)
  const [selectedWorkDayIds, setSelectedWorkDayIds] = useState<string[]>([])

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
        // Prevent toggling paid work days without confirmation
        if (existingDay.paid && existingDay.worked) {
          const confirmMessage = `This work day is already marked as paid. Changing it will affect financial records.\n\nAre you sure you want to continue?`
          if (!confirm(confirmMessage)) {
            setSyncStatus('synced')
            return
          }
        }
        const updatedWorkDay = { ...existingDay, worked: !existingDay.worked }
        await firebaseService.addWorkDay(updatedWorkDay)
      } else {
        const newWorkDay: WorkDay = {
          id: `${employeeId}-${date}`, // Use consistent ID format
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



  const calculateStats = () => {
    if (!employee) return { totalWorked: 0, totalPaid: 0, totalOwed: 0, totalEarned: 0, actualPaidAmount: 0, isOverpaid: false, creditAmount: 0 }
    
    // Only count work days that are in the past or today (not future)
    const today = new Date()
    today.setHours(23, 59, 59, 999) // End of today
    
    const workedDays = workDays.filter(day => day.worked && new Date(day.date) <= today)
    const paidDays = workDays.filter(day => day.paid && new Date(day.date) <= today)
    const unpaidDays = workDays.filter(day => day.worked && !day.paid && new Date(day.date) <= today)
    
    // Calculate actual amount paid from payment records
    const employeePayments = payments.filter(p => p.employeeId === employee.id)
    const actualPaidAmount = employeePayments.reduce((sum, payment) => sum + payment.amount, 0)
    
    // Calculate total earned - but only for UNPAID work days
    let totalEarnedFromUnpaidWork = 0
    
    for (const workDay of unpaidDays) {
      if (workDay.customAmount !== undefined) {
        // Use custom amount if specified
        totalEarnedFromUnpaidWork += workDay.customAmount
      } else {
        // Use wage logic
        if (employee.wageChangeDate && employee.previousWage && workDay.date < employee.wageChangeDate) {
          totalEarnedFromUnpaidWork += employee.previousWage
        } else {
          totalEarnedFromUnpaidWork += employee.dailyWage
        }
      }
    }
    
    // Calculate total earned (for display purposes)
    let totalEarned = 0
    for (const workDay of workedDays) {
      if (workDay.customAmount !== undefined) {
        totalEarned += workDay.customAmount
      } else {
        if (employee.wageChangeDate && employee.previousWage && workDay.date < employee.wageChangeDate) {
          totalEarned += employee.previousWage
        } else {
          totalEarned += employee.dailyWage
        }
      }
    }
    
    // Outstanding = amount owed for unpaid work only
    // (We shouldn't subtract payments since those are for work already marked as paid)
    const totalOwed = totalEarnedFromUnpaidWork
    const isOverpaid = totalOwed < 0
    const creditAmount = Math.abs(totalOwed)
    
    // Debug logging
    console.log('💰 Outstanding Balance Debug:', {
      workedDays: workedDays.length,
      paidDays: paidDays.length,
      unpaidDays: unpaidDays.length,
      unpaidWorkDaysDetails: unpaidDays.map(wd => ({
        date: wd.date,
        amount: getWorkDayAmount(wd)
      })),
      totalEarnedFromUnpaidWork,
      totalEarned,
      actualPaidAmount,
      totalOwed,
      employeePayments: employeePayments.length
    })
    
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

  const retryConnection = () => {
    window.location.reload()
  }

  const handlePaymentComplete = () => {
    // Payment completed, data will be updated via real-time listeners
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
    if (workDay.paid) {
      // For paid work days, find the payment record and show payment modal
      const relatedPayment = payments.find(payment => 
        payment.workDayIds.includes(workDay.id)
      )
      if (relatedPayment) {
        setSelectedPayment(relatedPayment)
        setShowPaymentEditModal(true)
      } else {
        // Fallback to work day modal if no payment record found
        setSelectedWorkDay(workDay)
        setShowWorkDayEditModal(true)
      }
    } else {
      // For unpaid work days, show work day edit modal
      setSelectedWorkDay(workDay)
      setShowWorkDayEditModal(true)
    }
  }

  const handleWorkDayUpdated = () => {
    setShowWorkDayEditModal(false)
    setSelectedWorkDay(null)
  }

  const toggleWorkDaySelection = (workDayId: string) => {
    setSelectedWorkDayIds(prev => 
      prev.includes(workDayId) 
        ? prev.filter(id => id !== workDayId)
        : [...prev, workDayId]
    )
  }

  const clearSelection = () => {
    setSelectedWorkDayIds([])
  }

  const selectAllUnpaidWorkDays = () => {
    const today = new Date()
    today.setHours(23, 59, 59, 999)
    const unpaidWorkDays = workDays.filter(day => 
      day.worked && !day.paid && new Date(day.date) <= today
    )
    setSelectedWorkDayIds(unpaidWorkDays.map(day => day.id))
  }

  const handleCreatePaymentForSelected = () => {
    if (selectedWorkDayIds.length > 0) {
      setShowPaymentModal(true)
    }
  }

  const handlePaymentCompleteWithSelection = () => {
    setSelectedWorkDayIds([])
    setShowPaymentModal(false)
    handlePaymentComplete()
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
      
      // Clean the employee data to remove undefined values
      const cleanEmployeeData: Employee = {
        id: updatedEmployee.id,
        name: updatedEmployee.name.trim(),
        dailyWage: updatedEmployee.dailyWage
      }

      // Only add optional fields if they have actual values
      if (updatedEmployee.email && updatedEmployee.email.trim()) {
        cleanEmployeeData.email = updatedEmployee.email.trim()
      }
      if (updatedEmployee.phone && updatedEmployee.phone.trim()) {
        cleanEmployeeData.phone = updatedEmployee.phone.trim()
      }
      if (updatedEmployee.startDate) {
        cleanEmployeeData.startDate = updatedEmployee.startDate
      }
      if (updatedEmployee.notes && updatedEmployee.notes.trim()) {
        cleanEmployeeData.notes = updatedEmployee.notes.trim()
      }
      if (updatedEmployee.wageChangeDate) {
        cleanEmployeeData.wageChangeDate = updatedEmployee.wageChangeDate
      }
      if (updatedEmployee.previousWage !== undefined) {
        cleanEmployeeData.previousWage = updatedEmployee.previousWage
      }
      
      // If wage changed and we have work days, handle the wage change logic
      if (wageUpdateOption && cleanEmployeeData.dailyWage !== employee?.dailyWage) {
        await handleWageChange(cleanEmployeeData, wageUpdateOption)
      }
      
      // Update employee
      await firebaseService.addEmployee(cleanEmployeeData)
      
      setEmployee(cleanEmployeeData)
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
    // Check if a work day already exists for this date
    const existingDay = workDays.find(day => day.date === quickAddDate)
    
    if (existingDay) {
      // Just show a message that the day is already logged
      const existingStatus = existingDay.worked ? 'worked' : 'scheduled'
      const paidStatus = existingDay.paid ? ' and paid' : ''
      alert(`This day is already logged in the system as ${existingStatus}${paidStatus}.\n\nTo edit this work day, please use the work history section below.`)
      return
    }
    
    // Only add new work day if it doesn't exist
    await toggleWorkDay(quickAddDate)
  }

  // Add data integrity validation
  const validateAndRepairDataIntegrity = async () => {
    try {
      console.log('Validating payment data integrity...')
      const validation = await firebaseService.validatePaymentIntegrity()
      
      if (!validation.isValid) {
        console.error('Payment integrity issues found:', validation.issues)
        setErrorMessage(`Data integrity issues detected: ${validation.issues.length} problems found. Auto-repairing...`)
        
        // Auto-repair the issues
        const repair = await firebaseService.repairPaymentIntegrity()
        console.log('Data integrity repair completed:', repair.repairActions)
        
        if (repair.success) {
          setErrorMessage('')
          // Real-time listeners will update the data automatically
        }
      }
    } catch (error) {
      console.error('Error validating data integrity:', error)
    }
  }

  // Call validation on component mount and when payments/workDays change
  useEffect(() => {
    if (employee && workDays.length > 0 && payments.length > 0) {
      validateAndRepairDataIntegrity()
    }
  }, [employee?.id, workDays.length, payments.length])

  // Add debugging helper to identify payment inconsistencies
  const getPaymentInconsistencies = () => {
    const inconsistencies: Array<{
      type: 'orphaned_payment' | 'orphaned_workday'
      workDay?: WorkDay
      payment?: Payment
      message: string
    }> = []

    // Check for work days marked as paid but no payment record
    const paidWorkDays = workDays.filter(wd => wd.paid)
    paidWorkDays.forEach(workDay => {
      const hasPaymentRecord = payments.some(payment => 
        payment.workDayIds.includes(workDay.id)
      )
      if (!hasPaymentRecord) {
        inconsistencies.push({
          type: 'orphaned_workday',
          workDay,
          message: `Work day ${format(parseISO(workDay.date), 'MMM d, yyyy')} is marked as paid but has no payment record`
        })
      }
    })

    // Check for payment records where work days are not marked as paid
    payments.forEach(payment => {
      const unpaidWorkDaysInPayment = payment.workDayIds.filter(wdId => {
        const workDay = workDays.find(wd => wd.id === wdId)
        return workDay && !workDay.paid
      })
      
      if (unpaidWorkDaysInPayment.length > 0) {
        inconsistencies.push({
          type: 'orphaned_payment',
          payment,
          message: `Payment £${payment.amount.toFixed(2)} on ${format(parseISO(payment.date), 'MMM d, yyyy')} includes work days that are not marked as paid`
        })
      }
    })

    return inconsistencies
  }

  const fixPaymentInconsistency = async (inconsistency: any) => {
    try {
      setSyncStatus('syncing')
      if (inconsistency.type === 'orphaned_workday') {
        // Work day marked as paid but no payment record - unmark as paid
        const updatedWorkDay = { ...inconsistency.workDay, paid: false }
        await firebaseService.addWorkDay(updatedWorkDay)
      } else if (inconsistency.type === 'orphaned_payment') {
        // Payment record exists but work days not marked as paid - mark them as paid
        const workDaysToUpdate = workDays.filter(wd => 
          inconsistency.payment.workDayIds.includes(wd.id) && !wd.paid
        )
        for (const workDay of workDaysToUpdate) {
          const updatedWorkDay = { ...workDay, paid: true }
          await firebaseService.addWorkDay(updatedWorkDay)
        }
      }
      setSyncStatus('synced')
    } catch (error) {
      console.error('Error fixing payment inconsistency:', error)
      setSyncStatus('error')
    }
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
    const [dailyWageInput, setDailyWageInput] = useState<string>(employee.dailyWage.toString())
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
                  value={dailyWageInput}
                  onChange={(e) => {
                    setDailyWageInput(e.target.value)
                    // Update formData with parsed number, default to 0 if empty or invalid
                    const parsedValue = e.target.value === '' ? 0 : parseFloat(e.target.value) || 0
                    setFormData(prev => ({ ...prev, dailyWage: parsedValue }))
                  }}
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
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value || '' }))}
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-blue-400 to-purple-600 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-pink-400 to-indigo-600 rounded-full mix-blend-multiply filter blur-xl animate-pulse" style={{animationDelay: '2s'}}></div>
        <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-gradient-to-br from-green-400 to-blue-600 rounded-full mix-blend-multiply filter blur-xl animate-pulse" style={{animationDelay: '4s'}}></div>
      </div>
      
      <div className="relative z-10 container mx-auto px-4 py-6 max-w-4xl">

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

      {/* Payment Integrity Debug Section */}
      {(() => {
        const inconsistencies = getPaymentInconsistencies()
        if (inconsistencies.length > 0) {
          return (
            <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3 flex-1">
                  <h3 className="text-sm font-medium text-yellow-800">Payment Data Inconsistencies Detected</h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p className="mb-3">Found {inconsistencies.length} payment inconsistencies that need to be fixed:</p>
                    <div className="space-y-2">
                      {inconsistencies.map((inconsistency, index) => (
                        <div key={index} className="flex items-center justify-between bg-white p-3 rounded border">
                          <div className="flex-1">
                            <div className="font-medium text-yellow-800 text-xs mb-1">
                              {inconsistency.type === 'orphaned_payment' ? '⚠️ Payment without paid work days' : '⚠️ Paid work day without payment record'}
                            </div>
                            <div className="text-xs text-yellow-700">{inconsistency.message}</div>
                          </div>
                          <button
                            onClick={() => fixPaymentInconsistency(inconsistency)}
                            className="ml-3 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded hover:bg-yellow-200 transition-colors"
                          >
                            Fix
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="mt-3">
                    <button
                      onClick={validateAndRepairDataIntegrity}
                      className="text-sm bg-yellow-100 text-yellow-800 px-3 py-1 rounded-md hover:bg-yellow-200 transition-colors"
                    >
                      Auto-Fix All Issues
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        }
        return null
      })()}

      {/* Header */}
      <div className="flex items-center justify-start mb-8">
        <button
          onClick={handleBackNavigation}
          className="inline-flex items-center px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all duration-200 group"
        >
          <svg className="w-4 h-4 mr-2 group-hover:-translate-x-0.5 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
                          <span className="font-medium">Back to Dashboard</span>
        </button>
      </div>

      {/* Employee Header & Quick Stats */}
      <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl border border-white/50 p-6 sm:p-8 mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          {/* Employee Info */}
          <div className="flex items-center space-x-4">
            <div className="relative">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-2xl">
                  {employee.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-3 border-white ${stats.totalOwed > 0 ? 'bg-amber-400' : 'bg-green-400'}`}></div>
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{employee.name}</h1>
              <div className="flex items-center space-x-3 mt-1">
                <span className="text-lg font-semibold text-gray-600">£{employee.dailyWage}/day</span>
                {employee.startDate && (
                  <span className="text-sm text-gray-500">• Started {format(new Date(employee.startDate), 'MMM d, yyyy')}</span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4 lg:gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.totalWorked}</div>
              <div className="text-sm text-gray-600">Days Worked</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.totalPaid}</div>
              <div className="text-sm text-gray-600">Days Paid</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${stats.totalOwed > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                £{stats.totalOwed.toFixed(0)}
              </div>
              <div className="text-sm text-gray-600">Outstanding</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        
        {/* Financial Overview - Left Column */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Financial Status Card */}
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">£</span>
              </div>
              <h2 className="text-lg font-bold text-gray-900">Financial Status</h2>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                <span className="text-gray-700 font-medium">Total Earned</span>
                <span className="font-bold text-gray-900">£{stats.totalEarned.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-xl">
                <span className="text-green-700 font-medium">Total Paid</span>
                <span className="font-bold text-green-600">£{stats.actualPaidAmount.toFixed(2)}</span>
              </div>
              <div className={`flex justify-between items-center p-4 rounded-xl border-2 ${
                stats.totalOwed > 0 ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'
              }`}>
                <span className="font-bold text-gray-900">Outstanding</span>
                <span className={`text-xl font-bold ${stats.totalOwed > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                  £{stats.totalOwed.toFixed(2)}
                </span>
              </div>
            </div>

            {stats.isOverpaid && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                <div className="flex items-center space-x-2 text-blue-700">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                  <span className="text-sm font-medium">Employee overpaid by £{stats.creditAmount.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Add or schedule a shift */}
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Add or schedule a shift</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Add Work Day</label>
                <div className="flex space-x-2">
                  <input
                    type="date"
                    value={quickAddDate}
                    onChange={(e) => setQuickAddDate(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={quickAddWorkDay}
                    disabled={syncStatus === 'syncing'}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {syncStatus === 'syncing' ? '...' : 'Add'}
                  </button>
                </div>
                {(() => {
                  const existingDay = workDays.find(day => day.date === quickAddDate)
                  if (existingDay && quickAddDate) {
                    const status = existingDay.worked ? 'worked' : 'scheduled'
                    const paidStatus = existingDay.paid ? ' and paid' : ''
                    return (
                      <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                        <div className="flex items-center space-x-2 text-amber-700">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                          </svg>
                          <span className="text-xs">
                            This day is already logged as <strong>{status}</strong>{paidStatus}. 
                            Use the work history section below to edit.
                          </span>
                        </div>
                      </div>
                    )
                  }
                  return null
                })()}
              </div>


            </div>
          </div>
        </div>

        {/* Work History & Timeline - Right Columns */}
        <div className="lg:col-span-2">
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900">Work & Payment History</h2>
            </div>

            {/* Scheduled Work */}
            {(() => {
              const today = new Date()
              today.setHours(23, 59, 59, 999) // End of today
              return workDays.filter(day => new Date(day.date) > today).length > 0
            })() && (
              <div className="mb-6">
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
                  <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Scheduled Work
                </h3>
                <div className="space-y-2">
                  {(() => {
                    const today = new Date()
                    today.setHours(23, 59, 59, 999) // End of today
                    return workDays
                      .filter(day => new Date(day.date) > today)
                      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                      .slice(0, 3)
                  })()
                    .map(workDay => (
                      <div 
                        key={workDay.id} 
                        className="p-4 rounded-lg border cursor-pointer hover:shadow-md transition-all bg-blue-50 border-blue-200 hover:bg-blue-100"
                        onClick={() => handleWorkDayClick(workDay)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                            <div>
                              <div className="font-medium text-gray-900 text-sm">
                                {format(parseISO(workDay.date), 'EEEE, MMMM d, yyyy')}
                              </div>
                              <div className="flex items-center space-x-2 mt-1">
                                <div className={`w-2 h-2 rounded-full ${
                                  workDay.worked ? 'bg-blue-500' : 'bg-gray-400'
                                }`}></div>
                                <span className="text-xs font-medium text-blue-700">
                                  Scheduled
                                </span>
                                {workDay.notes && (
                                  <>
                                    <span className="text-gray-300">•</span>
                                    <span className="text-xs text-blue-600">"{workDay.notes}"</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-gray-900">
                              £{getWorkDayAmount(workDay).toFixed(2)}
                            </div>
                            {workDay.customAmount !== undefined && (
                              <div className="text-xs text-blue-600">Custom rate</div>
                            )}
                            <div className="text-xs text-gray-500 mt-1">
                              {(() => {
                                const today = new Date()
                                today.setHours(23, 59, 59, 999) // End of today
                                return new Date(workDay.date) > today ? 'Future' : 'Today'
                              })()}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Recent Work History */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-800 flex items-center">
                  <svg className="w-4 h-4 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Recent Work History
                </h3>
                <button
                  onClick={() => router.push('/work-history')}
                  className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 rounded-lg transition-colors"
                  title="View full work history"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  View All
                </button>
              </div>

              {/* Payment Selection Controls - Show when days are selected */}
              {selectedWorkDayIds.length > 0 && (
                <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-blue-900">
                      {selectedWorkDayIds.length} day{selectedWorkDayIds.length !== 1 ? 's' : ''} selected
                    </h4>
                    <button
                      onClick={clearSelection}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="flex items-center space-x-3 mb-3">
                    <button
                      onClick={selectAllUnpaidWorkDays}
                      className="text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded hover:bg-blue-200 transition-colors"
                    >
                      Select All Unpaid
                    </button>
                    <span className="text-sm text-blue-700">
                      Total: £{(() => {
                        const selectedDays = workDays.filter(day => selectedWorkDayIds.includes(day.id))
                        return selectedDays.reduce((sum, day) => sum + getWorkDayAmount(day), 0).toFixed(2)
                      })()}
                    </span>
                  </div>
                  <button
                    onClick={handleCreatePaymentForSelected}
                    className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium"
                  >
                    Create Payment for Selected Days
                  </button>
                </div>
              )}
              
              <div className="space-y-2">
                {(() => {
                  const today = new Date()
                  today.setHours(23, 59, 59, 999) // End of today
                  return workDays
                    .filter(day => day.worked && new Date(day.date) <= today)
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .slice(0, 10)
                })()
                  .map(workDay => {
                    const relatedPayment = payments.find(payment => 
                      payment.workDayIds.includes(workDay.id)
                    )
                    const isSelected = selectedWorkDayIds.includes(workDay.id)
                    const isSelectable = !workDay.paid
                    
                    return (
                      <div 
                        key={workDay.id} 
                        className={`p-4 rounded-lg border transition-all cursor-pointer hover:shadow-md ${
                          workDay.paid 
                            ? 'bg-green-50 border-green-200 hover:bg-green-100' 
                            : 'bg-amber-50 border-amber-200 hover:bg-amber-100'
                        } ${isSelected ? 'ring-2 ring-blue-500 ring-opacity-50' : ''}`}
                        onClick={() => handleWorkDayClick(workDay)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            {/* Checkbox for selection mode */}
                            {isSelectable && (
                              <div 
                                className="flex-shrink-0"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  toggleWorkDaySelection(workDay.id)
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {}} // Handled by div onClick
                                  className="w-4 h-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer"
                                />
                              </div>
                            )}
                            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                            <div>
                              <div className="font-medium text-gray-900 text-sm">
                                {format(parseISO(workDay.date), 'EEEE, MMMM d, yyyy')}
                              </div>
                              <div className="flex items-center space-x-2 mt-1">
                                <div className={`w-2 h-2 rounded-full ${
                                  workDay.paid ? 'bg-green-500' : 'bg-amber-500'
                                }`}></div>
                                <span className={`text-xs font-medium ${
                                  workDay.paid ? 'text-green-700' : 'text-amber-700'
                                }`}>
                                  {workDay.paid ? 'Paid' : 'Unpaid'}
                                </span>
                                {workDay.paid && relatedPayment && (
                                  <>
                                    <span className="text-gray-300">•</span>
                                    <span className="text-xs text-gray-600">
                                      {format(parseISO(relatedPayment.date), 'MMM d')}
                                    </span>
                                  </>
                                )}
                                {workDay.notes && (
                                  <>
                                    <span className="text-gray-300">•</span>
                                    <span className="text-xs text-blue-600">"{workDay.notes}"</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-gray-900">
                              £{getWorkDayAmount(workDay).toFixed(2)}
                            </div>
                            {workDay.customAmount !== undefined && (
                              <div className="text-xs text-blue-600">Custom rate</div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Payments */}
      {payments.length > 0 && (
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-6 mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Recent Payments
          </h2>
          <div className="space-y-2">
            {payments
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .slice(0, 6)
              .map(payment => {
                const paidWorkDays = workDays.filter(wd => 
                  payment.workDayIds.includes(wd.id)
                ).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

                return (
                  <div 
                    key={payment.id} 
                    onClick={() => handlePaymentClick(payment)}
                    className="p-4 bg-green-50 border border-green-200 rounded-lg cursor-pointer hover:shadow-md hover:bg-green-100 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 text-sm">
                            Paid on {format(parseISO(payment.date), 'EEEE, MMMM d, yyyy')}
                          </div>
                          <div className="flex items-center space-x-2 mt-1">
                            <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                            <span className="text-xs font-medium text-green-700 flex-shrink-0">
                              {payment.paymentType}
                            </span>
                          </div>
                          <div className="text-xs text-green-600 mt-1 truncate">
                            {paidWorkDays.length} work day{paidWorkDays.length !== 1 ? 's' : ''}: {paidWorkDays.map(wd => format(parseISO(wd.date), 'MMM d')).join(', ')}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-gray-900">
                          £{payment.amount.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      )}

      {/* Employee Actions */}
      <div className="flex justify-center space-x-4 mb-6">
        <button
          onClick={() => setShowEditModal(true)}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-300 rounded-lg hover:bg-blue-100 hover:text-blue-700 transition-colors"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Edit Employee
        </button>
      </div>

      {/* Modals */}
      {showEditModal && employee && (
        <EditEmployeeModal
          employee={employee}
          onSave={updateEmployee}
          onClose={() => setShowEditModal(false)}
          workDays={workDays}
          payments={payments}
        />
      )}

      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => {
          setShowPaymentModal(false)
          if (selectedWorkDayIds.length > 0) {
            clearSelection()
          }
        }}
        employee={employee}
        selectedWorkDays={workDays.filter(day => selectedWorkDayIds.includes(day.id))}
        onPaymentComplete={handlePaymentCompleteWithSelection}
      />

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


      </div>
    </div>
  )
} 