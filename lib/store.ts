import { create } from 'zustand'
import { firebaseService } from './firebase'

export interface Employee {
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

export interface WorkDay {
  id: string
  employeeId: string
  date: string
  worked: boolean
  paid: boolean
  customAmount?: number // Optional custom amount for this specific day
  notes?: string // Optional notes for this work day
}

export interface Payment {
  id: string
  employeeId: string
  workDayIds: string[]
  amount: number
  paymentType: string
  notes?: string
  date: string
  createdAt: string
}

export interface DayNote {
  id: string
  date: string // Format: YYYY-MM-DD
  note: string
  createdAt: string
}

export type SyncStatus = 'syncing' | 'synced' | 'error'

interface AppState {
  // Data
  employees: Employee[]
  workDays: WorkDay[]
  payments: Payment[]
  dayNotes: DayNote[]
  
  // UI State
  loading: boolean
  syncStatus: SyncStatus
  errorMessage: string
  
  // Actions
  setEmployees: (employees: Employee[]) => void
  setWorkDays: (workDays: WorkDay[]) => void
  setPayments: (payments: Payment[]) => void
  setDayNotes: (dayNotes: DayNote[]) => void
  setLoading: (loading: boolean) => void
  setSyncStatus: (status: SyncStatus) => void
  setErrorMessage: (message: string) => void
  
  // Business Logic Actions
  addEmployee: (employee: Omit<Employee, 'id'>) => Promise<void>
  deleteEmployee: (id: string) => Promise<void>
  toggleWorkDay: (employeeId: string, date: string) => Promise<void>
  togglePayment: (employeeId: string, date: string) => Promise<void>
  addDayNote: (date: string, note: string) => Promise<void>
  deleteDayNote: (noteId: string) => Promise<void>
  retryConnection: () => Promise<void>
  
  // Computed/Helper functions
  getWorkDay: (employeeId: string, date: string) => WorkDay | undefined
  getDayNotes: (date: string) => DayNote[]
  calculateEmployeeStats: (employeeId: string) => {
    totalWorked: number
    totalPaid: number
    totalOwed: number
    totalEarned: number
    actualPaidAmount: number
  }
}

export const useAppStore = create<AppState>((set, get) => ({
  // Initial state
  employees: [],
  workDays: [],
  payments: [],
  dayNotes: [],
  loading: false, // Start as false, will be set to true only when actually loading
  syncStatus: 'synced', // Start as synced, will change when actually syncing
  errorMessage: '',
  
  // Basic setters
  setEmployees: (employees) => set({ employees }),
  setWorkDays: (workDays) => set({ workDays }),
  setPayments: (payments) => set({ payments }),
  setDayNotes: (dayNotes) => set({ dayNotes }),
  setLoading: (loading) => set({ loading }),
  setSyncStatus: (syncStatus) => set({ syncStatus }),
  setErrorMessage: (errorMessage) => set({ errorMessage }),
  
  // Business logic actions
  addEmployee: async (employeeData) => {
    const employeeId = Date.now().toString()
    const employee: Employee = {
      id: employeeId,
      ...employeeData,
      startDate: employeeData.startDate || new Date().toISOString().split('T')[0]
    }
    
    try {
      set({ syncStatus: 'syncing', errorMessage: '' })
      await firebaseService.addEmployee(employee)
      // Real-time listener will update the state
    } catch (error: any) {
      console.error('Error adding employee:', error)
      set({ 
        syncStatus: 'error', 
        errorMessage: `Failed to add employee: ${error.message}` 
      })
      throw error
    }
  },
  
  deleteEmployee: async (id) => {
    try {
      set({ syncStatus: 'syncing', errorMessage: '' })
      await Promise.all([
        firebaseService.deleteEmployee(id),
        firebaseService.deleteWorkDaysForEmployee(id)
      ])
      // Real-time listener will update the state
    } catch (error: any) {
      console.error('Error deleting employee:', error)
      set({ 
        syncStatus: 'error', 
        errorMessage: `Failed to delete employee: ${error.message}` 
      })
      throw error
    }
  },
  
  toggleWorkDay: async (employeeId, date) => {
    const { workDays } = get()
    const existingDay = workDays.find(day => day.employeeId === employeeId && day.date === date)
    
    try {
      set({ syncStatus: 'syncing', errorMessage: '' })
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
      // Real-time listener will update the state
    } catch (error: any) {
      console.error('Error updating work day:', error)
      set({ 
        syncStatus: 'error', 
        errorMessage: `Failed to update work day: ${error.message}` 
      })
      throw error
    }
  },
  
  togglePayment: async (employeeId, date) => {
    const { employees, workDays } = get()
    const existingDay = workDays.find(day => day.employeeId === employeeId && day.date === date)
    const employee = employees.find(emp => emp.id === employeeId)
    
    if (existingDay && employee) {
      try {
        set({ syncStatus: 'syncing', errorMessage: '' })
        
        if (!existingDay.paid) {
          // Mark as paid using robust service
          const amount = existingDay.customAmount !== undefined 
            ? existingDay.customAmount 
            : employee.dailyWage
            
          await firebaseService.createPaymentAndMarkWorkDays(
            employeeId,
            [existingDay.id],
            amount,
            'Cash', // Default payment type
            `Quick payment for work on ${date}`
          )
        } else {
          // Unmark as paid using robust service
          const result = await firebaseService.unmarkWorkDaysAsPaid([existingDay.id])
          
          if (result.requiresConfirmation) {
            // Show confirmation for payment records
            if (confirm(result.confirmationMessage)) {
              await firebaseService.forceUnmarkWorkDaysAsPaid([existingDay.id], 'update')
            } else {
              // User cancelled
              set({ syncStatus: 'synced' })
              return
            }
          }
        }
        
        // Real-time listener will update the state
      } catch (error: any) {
        console.error('Error updating payment:', error)
        set({ 
          syncStatus: 'error', 
          errorMessage: `Failed to update payment: ${error.message}` 
        })
        throw error
      }
    }
  },
  
  addDayNote: async (date, note) => {
    const dayNote: DayNote = {
      id: `note-${date}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      date,
      note,
      createdAt: new Date().toISOString()
    }
    
    try {
      console.log('Adding day note:', dayNote)
      set({ syncStatus: 'syncing', errorMessage: '' })
      await firebaseService.addDayNote(dayNote)
      console.log('Day note added successfully')
      // Real-time listener will update the state
    } catch (error: any) {
      console.error('Error adding day note:', error)
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        stack: error.stack
      })
      set({ 
        syncStatus: 'error', 
        errorMessage: `Failed to add day note: ${error.message}` 
      })
      throw error
    }
  },
  
  deleteDayNote: async (noteId) => {
    try {
      set({ syncStatus: 'syncing', errorMessage: '' })
      await firebaseService.deleteDayNote(noteId)
      // Real-time listener will update the state
    } catch (error: any) {
      console.error('Error deleting day note:', error)
      set({ 
        syncStatus: 'error', 
        errorMessage: `Failed to delete day note: ${error.message}` 
      })
      throw error
    }
  },
  
  retryConnection: async () => {
    try {
      set({ syncStatus: 'syncing', errorMessage: '' })
      await firebaseService.enableNetwork()
      
      // Reload data
      const [employeesData, workDaysData, paymentsData] = await Promise.all([
        firebaseService.getEmployees(),
        firebaseService.getWorkDays(),
        firebaseService.getPayments()
      ])
      
      set({
        employees: employeesData as Employee[],
        workDays: workDaysData as WorkDay[],
        payments: paymentsData as Payment[],
        syncStatus: 'synced'
      })
    } catch (error: any) {
      console.error('Error retrying connection:', error)
      set({ 
        syncStatus: 'error', 
        errorMessage: `Connection failed: ${error.message}` 
      })
      throw error
    }
  },
  
  // Helper functions
  getWorkDay: (employeeId, date) => {
    const { workDays } = get()
    return workDays.find(day => day.employeeId === employeeId && day.date === date)
  },
  
  getDayNotes: (date) => {
    const { dayNotes } = get()
    return dayNotes.filter(note => note.date === date)
  },
  
  calculateEmployeeStats: (employeeId) => {
    const { employees, workDays, payments } = get()
    const employee = employees.find(emp => emp.id === employeeId)
    if (!employee) return { totalWorked: 0, totalPaid: 0, totalOwed: 0, totalEarned: 0, actualPaidAmount: 0 }
    
    // Only count work days that are in the past or today (not future)
    const today = new Date()
    today.setHours(23, 59, 59, 999) // End of today
    
    const workedDays = workDays.filter(day => 
      day.employeeId === employeeId && day.worked && new Date(day.date) <= today
    )
    
    const paidDays = workDays.filter(day => 
      day.employeeId === employeeId && day.paid && new Date(day.date) <= today
    )
    
    // Calculate total earned based on actual work day rates (including custom amounts)
    let totalEarned = 0
    for (const workDay of workedDays) {
      if (workDay.customAmount !== undefined) {
        // Use custom amount if specified
        totalEarned += workDay.customAmount
      } else {
        // Use wage logic (accounting for wage changes)
        if (employee.wageChangeDate && employee.previousWage && workDay.date < employee.wageChangeDate) {
          totalEarned += employee.previousWage
        } else {
          totalEarned += employee.dailyWage
        }
      }
    }
    
    // Calculate actual paid amount from payment records (most accurate method)
    const employeePayments = payments.filter(p => p.employeeId === employeeId)
    const actualPaidAmount = employeePayments.reduce((sum, payment) => sum + payment.amount, 0)
    
    // For backwards compatibility, also calculate paid amount from work days
    // This is used as fallback if no payment records exist
    let calculatedPaidAmount = 0
    for (const workDay of paidDays) {
      if (workDay.customAmount !== undefined) {
        calculatedPaidAmount += workDay.customAmount
      } else {
        if (employee.wageChangeDate && employee.previousWage && workDay.date < employee.wageChangeDate) {
          calculatedPaidAmount += employee.previousWage
        } else {
          calculatedPaidAmount += employee.dailyWage
        }
      }
    }
    
    // Use actual payment records if available, otherwise fall back to calculated amount
    const finalPaidAmount = actualPaidAmount > 0 ? actualPaidAmount : calculatedPaidAmount
    
    const totalOwed = totalEarned - finalPaidAmount
    
    return { 
      totalWorked: workedDays.length, 
      totalPaid: paidDays.length, 
      totalOwed, 
      totalEarned,
      actualPaidAmount: finalPaidAmount
    }
  }
})) 