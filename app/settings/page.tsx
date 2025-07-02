'use client'

import { useState, useEffect } from 'react'
import { firebaseService } from '../../lib/firebase'
import { useAppStore } from '../../lib/store'
import * as XLSX from 'xlsx'

import AuthGuard from '../components/AuthGuard'
import ReportModal from '../components/ReportModal'

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

interface Payment {
  id: string
  employeeId: string
  workDayIds: string[]
  amount: number
  paymentType: string
  notes?: string
  date: string
  createdAt: string
}

interface DayNote {
  id: string
  date: string
  note: string
  createdAt: string
}

export default function Settings() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [workDays, setWorkDays] = useState<WorkDay[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [dayNotes, setDayNotes] = useState<DayNote[]>([])
  const [loading, setLoading] = useState(true)
  const [showClearAllModal, setShowClearAllModal] = useState(false)
  const [showEmployeeModal, setShowEmployeeModal] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [showReportModal, setShowReportModal] = useState(false)
  const [importing, setImporting] = useState(false)
  
  // Get sync status from the store
  const { syncStatus, errorMessage, retryConnection } = useAppStore()

  useEffect(() => {
    const loadData = async () => {
      try {
        const [employeesData, workDaysData, paymentsData, dayNotesData] = await Promise.all([
          firebaseService.getEmployees(),
          firebaseService.getWorkDays(),
          firebaseService.getPayments(),
          firebaseService.getDayNotes()
        ])
        
        setEmployees(employeesData as Employee[])
        setWorkDays(workDaysData as WorkDay[])
        setPayments(paymentsData as Payment[])
        setDayNotes(dayNotesData as DayNote[])
      } catch (error) {
        console.error('Error loading data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const handleNavigate = (path: string) => {
    window.location.href = path
  }

  const exportData = async () => {
    try {
      const data = {
        version: '1.0.0',
        exportDate: new Date().toISOString(),
        appName: 'My Days Work Tracker',
        employees,
        workDays,
        payments,
        dayNotes,
        summary: {
          totalEmployees: employees.length,
          totalWorkDays: workDays.length,
          totalPayments: payments.length,
          totalDayNotes: dayNotes.length,
          totalWorkedDays: workDays.filter(wd => wd.worked).length,
          totalPaidDays: workDays.filter(wd => wd.paid).length
        }
      }
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `my-days-backup-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      alert('Complete backup exported successfully! This includes all employees, work days, payment records, and day notes.')
    } catch (error) {
      console.error('Export failed:', error)
      alert('Export failed. Please try again.')
    }
  }

  const importData = async (file: File) => {
    try {
      setImporting(true)
      
      const text = await file.text()
      const data = JSON.parse(text)
      
      // Validate the imported data structure
      if (!data.employees || !Array.isArray(data.employees)) {
        throw new Error('Invalid backup file: Missing or invalid employees data')
      }
      if (!data.workDays || !Array.isArray(data.workDays)) {
        throw new Error('Invalid backup file: Missing or invalid work days data')
      }
      if (!data.payments || !Array.isArray(data.payments)) {
        throw new Error('Invalid backup file: Missing or invalid payments data')
      }
      // Day notes is optional for backward compatibility with older backups
      if (data.dayNotes && !Array.isArray(data.dayNotes)) {
        throw new Error('Invalid backup file: Invalid day notes data')
      }
      
      // Additional validation
      const importedEmployees = data.employees as Employee[]
      const importedWorkDays = data.workDays as WorkDay[]
      const importedPayments = data.payments as Payment[]
      const importedDayNotes = (data.dayNotes as DayNote[]) || []
      
      // Validate employee structure
      for (const emp of importedEmployees) {
        if (!emp.id || !emp.name || typeof emp.dailyWage !== 'number') {
          throw new Error('Invalid employee data structure in backup file')
        }
      }
      
      // Validate work days structure
      for (const wd of importedWorkDays) {
        if (!wd.id || !wd.employeeId || !wd.date || typeof wd.worked !== 'boolean' || typeof wd.paid !== 'boolean') {
          throw new Error('Invalid work day data structure in backup file')
        }
      }
      
      // Validate payments structure
      for (const payment of importedPayments) {
        if (!payment.id || !payment.employeeId || !Array.isArray(payment.workDayIds) || typeof payment.amount !== 'number') {
          throw new Error('Invalid payment data structure in backup file')
        }
      }
      
      // Validate day notes structure (if present)
      for (const note of importedDayNotes) {
        if (!note.id || !note.date || !note.note || !note.createdAt) {
          throw new Error('Invalid day note data structure in backup file')
        }
      }
      
      // Validate data integrity and relationships
      const employeeIds = new Set(importedEmployees.map(emp => emp.id))
      
      // Check that all work days reference valid employees
      for (const wd of importedWorkDays) {
        if (!employeeIds.has(wd.employeeId)) {
          throw new Error(`Work day ${wd.id} references non-existent employee ${wd.employeeId}`)
        }
      }
      
      // Check that all payments reference valid employees and work days
      const workDayIds = new Set(importedWorkDays.map(wd => wd.id))
      for (const payment of importedPayments) {
        if (!employeeIds.has(payment.employeeId)) {
          throw new Error(`Payment ${payment.id} references non-existent employee ${payment.employeeId}`)
        }
        for (const wdId of payment.workDayIds) {
          if (!workDayIds.has(wdId)) {
            throw new Error(`Payment ${payment.id} references non-existent work day ${wdId}`)
          }
        }
      }
      
      // Confirm with user before clearing existing data
      const confirmMessage = `This will replace ALL your current data with the backup data.\n\nBackup contains:\n• ${importedEmployees.length} employees\n• ${importedWorkDays.length} work days\n• ${importedPayments.length} payments\n• ${importedDayNotes.length} day notes\n\nYour current data will be permanently deleted. Continue?`
      
      if (!confirm(confirmMessage)) {
        setImporting(false)
        return
      }
      
      // Final confirmation
      if (!confirm('Are you absolutely sure? This action cannot be undone.')) {
        setImporting(false)
        return
      }
      
      // Clear all existing data first
      await Promise.all([
        // Delete all employees (this cascades to work days)
        ...employees.map(employee => firebaseService.deleteEmployee(employee.id)),
        // Delete all work days
        ...employees.map(employee => firebaseService.deleteWorkDaysForEmployee(employee.id)),
        // Delete all payments
        firebaseService.deleteAllPayments(),
        // Delete all day notes (bulk delete for efficiency)
        firebaseService.deleteAllDayNotes()
      ])
      
      // Import new data with detailed progress tracking
      try {
        console.log('Starting data import process...')
        
        // Import employees first
        console.log(`Importing ${importedEmployees.length} employees...`)
        await Promise.all(importedEmployees.map(employee => firebaseService.addEmployee(employee)))
        
        // Import work days
        console.log(`Importing ${importedWorkDays.length} work days...`)
        await Promise.all(importedWorkDays.map(workDay => firebaseService.addWorkDay(workDay)))
        
        // Import payments
        console.log(`Importing ${importedPayments.length} payments...`)
        await Promise.all(importedPayments.map(payment => firebaseService.addPayment(payment)))
        
        // Import day notes
        if (importedDayNotes.length > 0) {
          console.log(`Importing ${importedDayNotes.length} day notes...`)
          await Promise.all(importedDayNotes.map(dayNote => firebaseService.addDayNote(dayNote)))
        }
        
        console.log('Data import completed successfully')
        
        // Update local state
        setEmployees(importedEmployees)
        setWorkDays(importedWorkDays)
        setPayments(importedPayments)
        setDayNotes(importedDayNotes)
        
        // Calculate some quick stats for confirmation
        const workedDays = importedWorkDays.filter(wd => wd.worked).length
        const paidDays = importedWorkDays.filter(wd => wd.paid).length
        const totalPaymentAmount = importedPayments.reduce((sum, p) => sum + p.amount, 0)
        
        alert(`✅ Data imported successfully!\n\nRESTORED DATA:\n• ${importedEmployees.length} employees\n• ${importedWorkDays.length} work days (${workedDays} worked, ${paidDays} paid)\n• ${importedPayments.length} payments (£${totalPaymentAmount.toFixed(2)} total)\n• ${importedDayNotes.length} calendar notes\n\n🎉 All data has been restored from the backup and is ready to use!`)
        
      } catch (importError: any) {
        console.error('Import process failed:', importError)
        throw new Error(`Failed to import data: ${importError.message}. Your existing data has been cleared, but the backup import failed. You may need to try importing again or restore from another backup.`)
      }
      
    } catch (error: any) {
      console.error('Import failed:', error)
      alert(`Import failed: ${error.message}\n\nPlease check that you're using a valid backup file exported from this app.`)
    } finally {
      setImporting(false)
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
        alert('Please select a valid JSON backup file.')
        return
      }
      importData(file)
    }
    // Reset the input so the same file can be selected again
    event.target.value = ''
  }

  const exportToCSV = async () => {
    try {
      // Only count work days that are in the past or today (not future)
      const today = new Date()
      today.setHours(23, 59, 59, 999) // End of today
      
      // Create comprehensive work data for CSV
      const workData: any[] = []
      
      // Add header row with enhanced columns
      workData.push([
        'Employee Name',
        'Employee Email',
        'Employee Phone',
        'Employee Start Date',
        'Current Daily Wage',
        'Previous Wage',
        'Wage Change Date',
        'Work Date',
        'Day of Week',
        'Week Number',
        'Month',
        'Year',
        'Worked (Yes/No)',
        'Paid (Yes/No)',
        'Custom Amount Used',
        'Amount Earned This Day',
        'Payment Date',
        'Payment Method',
        'Payment Amount',
        'Payment Notes',
        'Work Day Notes',
        'Employee Notes',
        'Days Since Start',
        'Days Since Last Payment',
        'Consecutive Work Days',
        'Employee Total Earned',
        'Employee Total Paid',
        'Employee Outstanding',
        'Work Day ID',
        'Payment ID'
      ])
      
      // Helper function to get week number
      const getWeekNumber = (date: Date) => {
        const firstDayOfYear = new Date(date.getFullYear(), 0, 1)
        const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000
        return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7)
      }
      
      // Helper function to calculate consecutive work days
      const getConsecutiveWorkDays = (empWorkDays: WorkDay[], currentDate: string) => {
        const sortedWorked = empWorkDays
          .filter(wd => wd.worked && wd.date <= currentDate)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        
        let consecutive = 0
        let expectedDate = new Date(currentDate)
        
        for (const workDay of sortedWorked) {
          const workDate = new Date(workDay.date)
          if (workDate.toDateString() === expectedDate.toDateString()) {
            consecutive++
            expectedDate.setDate(expectedDate.getDate() - 1)
          } else {
            break
          }
        }
        
        return consecutive
      }

      // Process each employee's work days with enhanced data
      employees.forEach(employee => {
        const empWorkDays = workDays.filter(wd => wd.employeeId === employee.id)
        const empPayments = payments.filter(p => p.employeeId === employee.id).sort((a, b) => 
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        )
        
        // Calculate totals for this employee
        const workedDays = empWorkDays.filter(wd => wd.worked && new Date(wd.date) <= today)
        let totalEarned = 0
        let totalPaid = 0
        
        // Calculate total earned
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
        
        // Calculate total paid from payment records
        totalPaid = empPayments.reduce((sum, payment) => sum + payment.amount, 0)
        
        // Calculate days since start
        const startDate = employee.startDate ? new Date(employee.startDate) : null
        const daysSinceStart = startDate ? Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) : null
        
        // Find last payment date
        const lastPayment = empPayments[empPayments.length - 1]
        const lastPaymentDate = lastPayment ? new Date(lastPayment.createdAt) : null
        const daysSinceLastPayment = lastPaymentDate ? Math.floor((today.getTime() - lastPaymentDate.getTime()) / (1000 * 60 * 60 * 24)) : null
        
        // Add work days data with enhanced information
        empWorkDays
          .filter(wd => new Date(wd.date) <= today) // Only past/present days
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()) // Sort by date
          .forEach(workDay => {
            const workDate = new Date(workDay.date)
            const dayOfWeek = workDate.toLocaleDateString('en-US', { weekday: 'long' })
            const weekNumber = getWeekNumber(workDate)
            const month = workDate.toLocaleDateString('en-US', { month: 'long' })
            const year = workDate.getFullYear()
            
            // Calculate amount for this specific day
            let dayAmount = 0
            if (workDay.worked) {
              if (workDay.customAmount !== undefined) {
                dayAmount = workDay.customAmount
              } else {
                if (employee.wageChangeDate && employee.previousWage && workDay.date < employee.wageChangeDate) {
                  dayAmount = employee.previousWage
                } else {
                  dayAmount = employee.dailyWage
                }
              }
            }
            
            // Find payment information for this work day
            const relatedPayment = empPayments.find(p => p.workDayIds.includes(workDay.id))
            const paymentMethod = relatedPayment ? relatedPayment.paymentType : (workDay.paid ? 'Unknown' : 'Unpaid')
            const paymentDate = relatedPayment ? new Date(relatedPayment.date).toLocaleDateString('en-US') : ''
            const paymentAmount = relatedPayment ? relatedPayment.amount : 0
            const paymentNotes = relatedPayment ? (relatedPayment.notes || '') : ''
            
            // Calculate consecutive work days up to this date
            const consecutiveDays = workDay.worked ? getConsecutiveWorkDays(empWorkDays, workDay.date) : 0
            
            workData.push([
              employee.name,
              employee.email || '',
              employee.phone || '',
              employee.startDate || '',
              `£${employee.dailyWage}`,
              employee.previousWage ? `£${employee.previousWage}` : '',
              employee.wageChangeDate || '',
              workDay.date,
              dayOfWeek,
              weekNumber,
              month,
              year,
              workDay.worked ? 'Yes' : 'No',
              workDay.paid ? 'Yes' : 'No',
              workDay.customAmount !== undefined ? 'Yes' : 'No',
              workDay.worked ? `£${dayAmount.toFixed(2)}` : '£0.00',
              paymentDate,
              paymentMethod,
              relatedPayment ? `£${paymentAmount.toFixed(2)}` : '',
              paymentNotes,
              workDay.notes || '',
              employee.notes || '',
              daysSinceStart || '',
              daysSinceLastPayment || '',
              consecutiveDays,
              `£${totalEarned.toFixed(2)}`,
              `£${totalPaid.toFixed(2)}`,
              `£${Math.max(0, totalEarned - totalPaid).toFixed(2)}`,
              workDay.id,
              relatedPayment ? relatedPayment.id : ''
            ])
          })
        
        // Add employee summary row if they have work days
        if (empWorkDays.length > 0) {
          const paidDays = empWorkDays.filter(wd => wd.paid).length
          const avgDailyEarnings = workedDays.length > 0 ? totalEarned / workedDays.length : 0
          const paymentCount = empPayments.length
          const avgPaymentAmount = paymentCount > 0 ? totalPaid / paymentCount : 0
          
          workData.push([
            `${employee.name} - EMPLOYEE SUMMARY`,
            employee.email || '',
            employee.phone || '',
            employee.startDate || '',
            `£${employee.dailyWage}`,
            employee.previousWage ? `£${employee.previousWage}` : '',
            employee.wageChangeDate || '',
            '',
            '',
            '',
            '',
            '',
            `${workedDays.length} days worked`,
            `${paidDays} days paid`,
            '',
            `£${avgDailyEarnings.toFixed(2)} avg/day`,
            '',
            `${paymentCount} payments made`,
            `£${avgPaymentAmount.toFixed(2)} avg payment`,
            '',
            '',
            employee.notes || '',
            daysSinceStart || '',
            daysSinceLastPayment || '',
            '',
            `£${totalEarned.toFixed(2)}`,
            `£${totalPaid.toFixed(2)}`,
            `£${Math.max(0, totalEarned - totalPaid).toFixed(2)}`,
            '',
            ''
          ])
          
          // Add empty row for spacing
          workData.push(['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''])
        }
      })
      
      // Add day notes as a separate section
      if (dayNotes.length > 0) {
        workData.push(['=== DAY NOTES SECTION ===', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''])
        workData.push(['Date', 'Day of Week', 'Day Note', 'Created At', 'Week Number', 'Month', 'Year', 'Note ID', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''])
        
        dayNotes
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
          .forEach(note => {
            const noteDate = new Date(note.date)
            const dayOfWeek = noteDate.toLocaleDateString('en-US', { weekday: 'long' })
            const weekNumber = getWeekNumber(noteDate)
            const month = noteDate.toLocaleDateString('en-US', { month: 'long' })
            const year = noteDate.getFullYear()
            const createdAt = new Date(note.createdAt).toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'short', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })
            
            workData.push([
              note.date,
              dayOfWeek,
              note.note,
              createdAt,
              weekNumber,
              month,
              year,
              note.id,
              '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''
            ])
          })
      }
      
      // Add comprehensive business summary statistics
      const totalWorkedDays = workDays.filter(wd => wd.worked && new Date(wd.date) <= today).length
      const totalPaidDays = workDays.filter(wd => wd.paid && new Date(wd.date) <= today).length
      const totalEarnedAllEmployees = employees.reduce((total, emp) => {
        const empWorkDays = workDays.filter(wd => wd.employeeId === emp.id && wd.worked && new Date(wd.date) <= today)
        return total + empWorkDays.reduce((empTotal, wd) => {
          if (wd.customAmount !== undefined) return empTotal + wd.customAmount
          if (emp.wageChangeDate && emp.previousWage && wd.date < emp.wageChangeDate) return empTotal + emp.previousWage
          return empTotal + emp.dailyWage
        }, 0)
      }, 0)
      const totalPaidAllEmployees = payments.reduce((sum, p) => sum + p.amount, 0)
      const totalOutstandingAllEmployees = totalEarnedAllEmployees - totalPaidAllEmployees
      
      workData.push(['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''])
      workData.push(['=== COMPREHENSIVE BUSINESS SUMMARY ===', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''])
      workData.push(['Metric', 'Value', 'Details', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''])
      workData.push(['Total Employees', employees.length, 'All registered employees', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''])
      workData.push(['Total Work Days Logged', totalWorkedDays, 'Days where work was actually completed', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''])
      workData.push(['Total Days Paid', totalPaidDays, 'Work days that have been paid', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''])
      workData.push(['Total Payments Made', payments.length, 'Number of payment transactions', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''])
      workData.push(['Total Amount Earned', `£${totalEarnedAllEmployees.toFixed(2)}`, 'Total amount earned by all employees', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''])
      workData.push(['Total Amount Paid Out', `£${totalPaidAllEmployees.toFixed(2)}`, 'Total amount paid to all employees', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''])
      workData.push(['Total Outstanding Amount', `£${Math.max(0, totalOutstandingAllEmployees).toFixed(2)}`, 'Total amount still owed to employees', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''])
      workData.push(['Total Day Notes', dayNotes.length, 'Calendar notes and reminders', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''])
      workData.push(['Average Daily Wage', `£${employees.length > 0 ? (employees.reduce((sum, emp) => sum + emp.dailyWage, 0) / employees.length).toFixed(2) : '0.00'}`, 'Average wage across all employees', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''])
      workData.push(['Work Completion Rate', `${totalWorkedDays > 0 && totalPaidDays > 0 ? ((totalPaidDays / totalWorkedDays) * 100).toFixed(1) : '0'}%`, 'Percentage of worked days that are paid', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''])
      workData.push(['Export Generated', new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }), 'Date and time this report was generated', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''])
      
      // Convert to CSV string
      const csvContent = workData.map(row => 
        row.map((cell: any) => {
          // Escape quotes and wrap in quotes if contains comma, quote, or newline
          const cellStr = String(cell || '')
          if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
            return `"${cellStr.replace(/"/g, '""')}"`
          }
          return cellStr
        }).join(',')
      ).join('\n')
      
      // Create and download the CSV file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `my-days-work-data-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      alert('Enhanced CSV export completed successfully! \n\nIncludes:\n• Detailed work history with enhanced columns\n• Employee contact information and wage history\n• Payment tracking with dates and methods\n• Calendar day notes with timestamps\n• Comprehensive business analytics\n• Performance metrics and statistics\n\nOpen the file in Excel, Google Sheets, or any spreadsheet application for advanced analysis.')
    } catch (error) {
      console.error('CSV export failed:', error)
      alert('CSV export failed. Please try again.')
    }
  }

  const exportToPDF = async () => {
    try {
      // Only count work days that are in the past or today (not future)
      const today = new Date()
      today.setHours(23, 59, 59, 999) // End of today
      
      // Calculate comprehensive business metrics
      const totalWorkedDays = workDays.filter(wd => wd.worked && new Date(wd.date) <= today).length
      const totalPaidDays = workDays.filter(wd => wd.paid && new Date(wd.date) <= today).length
      const totalEarnedAllEmployees = employees.reduce((total, emp) => {
        const empWorkDays = workDays.filter(wd => wd.employeeId === emp.id && wd.worked && new Date(wd.date) <= today)
        return total + empWorkDays.reduce((empTotal, wd) => {
          if (wd.customAmount !== undefined) return empTotal + wd.customAmount
          if (emp.wageChangeDate && emp.previousWage && wd.date < emp.wageChangeDate) return empTotal + emp.previousWage
          return empTotal + emp.dailyWage
        }, 0)
      }, 0)
      const totalPaidAllEmployees = payments.reduce((sum, p) => sum + p.amount, 0)
      const totalOutstandingAllEmployees = totalEarnedAllEmployees - totalPaidAllEmployees
      const avgDailyWage = employees.length > 0 ? employees.reduce((sum, emp) => sum + emp.dailyWage, 0) / employees.length : 0
      const workCompletionRate = totalWorkedDays > 0 && totalPaidDays > 0 ? (totalPaidDays / totalWorkedDays) * 100 : 0
      
      // Create comprehensive report data
      const reportData = {
        title: 'My Days Work Tracker - Executive Business Report',
        subtitle: 'Comprehensive Workforce Analytics & Financial Summary',
        date: new Date().toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }),
        time: new Date().toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        }),
        summary: {
          totalEmployees: employees.length,
          totalWorkDays: totalWorkedDays,
          totalPaidDays: totalPaidDays,
          totalEarned: totalEarnedAllEmployees,
          totalPaid: totalPaidAllEmployees,
          totalOutstanding: totalOutstandingAllEmployees,
          avgDailyWage: avgDailyWage,
          workCompletionRate: workCompletionRate,
          paymentCount: payments.length,
          dayNotesCount: dayNotes.length
        },
        employees: employees.map(emp => {
          const empWorkDays = workDays.filter(wd => wd.employeeId === emp.id)
          const workedDays = empWorkDays.filter(wd => wd.worked && new Date(wd.date) <= today)
          const paidDays = empWorkDays.filter(wd => wd.paid && new Date(wd.date) <= today)
          const empPayments = payments.filter(p => p.employeeId === emp.id)
          
          let totalEarned = 0
          for (const workDay of workedDays) {
            if (workDay.customAmount !== undefined) {
              totalEarned += workDay.customAmount
            } else {
              if (emp.wageChangeDate && emp.previousWage && workDay.date < emp.wageChangeDate) {
                totalEarned += emp.previousWage
              } else {
                totalEarned += emp.dailyWage
              }
            }
          }
          
          const totalPaid = empPayments.reduce((sum, payment) => sum + payment.amount, 0)
          const outstanding = Math.max(0, totalEarned - totalPaid)
          
          return {
            name: emp.name,
            email: emp.email || 'Not provided',
            phone: emp.phone || 'Not provided',
            startDate: emp.startDate || 'Not specified',
            dailyWage: emp.dailyWage,
            previousWage: emp.previousWage,
            workedDays: workedDays.length,
            paidDays: paidDays.length,
            totalEarned,
            totalPaid,
            outstanding,
            paymentCount: empPayments.length,
            avgDailyEarnings: workedDays.length > 0 ? totalEarned / workedDays.length : 0,
            performanceRating: workedDays.length >= 20 ? 'EXCELLENT' : workedDays.length >= 10 ? 'GOOD' : workedDays.length >= 5 ? 'AVERAGE' : 'LOW',
            priorityLevel: outstanding > 1000 ? 'HIGH' : outstanding > 500 ? 'MEDIUM' : outstanding > 0 ? 'LOW' : 'NONE',
            notes: emp.notes || ''
          }
        })
      }

      // Create professional HTML content for the report
      const htmlContent = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>My Days Business Report</title>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body { 
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
              line-height: 1.6;
              color: #1f2937;
              background: #ffffff;
              font-size: 14px;
            }
            
            .page {
              max-width: 210mm;
              margin: 0 auto;
              padding: 20mm;
              background: white;
              box-shadow: 0 0 20px rgba(0,0,0,0.1);
              min-height: 297mm;
            }
            
            /* Header Section */
            .header {
              text-align: center;
              margin-bottom: 40px;
              padding: 30px 0;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              border-radius: 12px;
              position: relative;
              overflow: hidden;
            }
            
            .header::before {
              content: '';
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="20" cy="20" r="1" fill="white" opacity="0.1"/><circle cx="80" cy="80" r="1" fill="white" opacity="0.1"/><circle cx="40" cy="60" r="1" fill="white" opacity="0.1"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
              opacity: 0.3;
            }
            
            .header-content {
              position: relative;
              z-index: 2;
            }
            
            .header h1 {
              font-size: 2.5rem;
              font-weight: 700;
              margin-bottom: 8px;
              letter-spacing: -0.025em;
            }
            
            .header .subtitle {
              font-size: 1.1rem;
              font-weight: 400;
              opacity: 0.9;
              margin-bottom: 20px;
            }
            
            .header .meta {
              font-size: 0.95rem;
              opacity: 0.8;
              font-weight: 300;
            }
            
            /* Executive Summary */
            .executive-summary {
              background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
              border-radius: 16px;
              padding: 30px;
              margin-bottom: 40px;
              border: 1px solid #e2e8f0;
              position: relative;
            }
            
            .executive-summary::before {
              content: '';
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              height: 4px;
              background: linear-gradient(90deg, #667eea, #764ba2, #f093fb, #f5576c);
              border-radius: 16px 16px 0 0;
            }
            
            .executive-summary h2 {
              color: #1e293b;
              font-size: 1.5rem;
              font-weight: 600;
              margin-bottom: 25px;
              display: flex;
              align-items: center;
            }
            
            .executive-summary h2::before {
              content: '📊';
              margin-right: 10px;
              font-size: 1.2rem;
            }
            
            .kpi-grid {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
              gap: 20px;
              margin-bottom: 25px;
            }
            
            .kpi-card {
              background: white;
              padding: 20px;
              border-radius: 12px;
              text-align: center;
              border: 1px solid #e2e8f0;
              box-shadow: 0 2px 4px rgba(0,0,0,0.05);
              transition: transform 0.2s ease;
            }
            
            .kpi-card:hover {
              transform: translateY(-2px);
              box-shadow: 0 4px 8px rgba(0,0,0,0.1);
            }
            
            .kpi-value {
              font-size: 2rem;
              font-weight: 700;
              color: #1e293b;
              margin-bottom: 5px;
              display: block;
            }
            
            .kpi-label {
              font-size: 0.9rem;
              color: #64748b;
              font-weight: 500;
              text-transform: uppercase;
              letter-spacing: 0.05em;
            }
            
            .kpi-card.earnings .kpi-value { color: #059669; }
            .kpi-card.outstanding .kpi-value { color: #dc2626; }
            .kpi-card.performance .kpi-value { color: #7c3aed; }
            .kpi-card.workforce .kpi-value { color: #2563eb; }
            
            /* Performance Indicators */
            .performance-section {
              background: white;
              border-radius: 12px;
              padding: 25px;
              margin-bottom: 30px;
              border: 1px solid #e2e8f0;
              box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            }
            
            .performance-section h3 {
              color: #1e293b;
              font-size: 1.3rem;
              font-weight: 600;
              margin-bottom: 20px;
              display: flex;
              align-items: center;
            }
            
            .performance-section h3::before {
              content: '📈';
              margin-right: 10px;
              font-size: 1.1rem;
            }
            
            .performance-metrics {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
              gap: 15px;
            }
            
            .metric {
              background: #f8fafc;
              padding: 15px;
              border-radius: 8px;
              border-left: 4px solid #3b82f6;
            }
            
            .metric-label {
              font-size: 0.85rem;
              color: #64748b;
              font-weight: 500;
              margin-bottom: 5px;
            }
            
            .metric-value {
              font-size: 1.2rem;
              font-weight: 600;
              color: #1e293b;
            }
            
            /* Employee Details */
            .employees-section {
              margin-top: 40px;
            }
            
            .employees-section h2 {
              color: #1e293b;
              font-size: 1.5rem;
              font-weight: 600;
              margin-bottom: 25px;
              display: flex;
              align-items: center;
            }
            
            .employees-section h2::before {
              content: '👥';
              margin-right: 10px;
              font-size: 1.2rem;
            }
            
            .employee-grid {
              display: grid;
              gap: 20px;
            }
            
            .employee-card {
              background: white;
              border-radius: 12px;
              padding: 25px;
              border: 1px solid #e2e8f0;
              box-shadow: 0 2px 4px rgba(0,0,0,0.05);
              position: relative;
              overflow: hidden;
            }
            
            .employee-card::before {
              content: '';
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              height: 3px;
              background: linear-gradient(90deg, #3b82f6, #8b5cf6, #06b6d4);
            }
            
            .employee-header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-bottom: 20px;
            }
            
            .employee-info h4 {
              color: #1e293b;
              font-size: 1.2rem;
              font-weight: 600;
              margin-bottom: 5px;
            }
            
            .employee-meta {
              font-size: 0.9rem;
              color: #64748b;
              line-height: 1.4;
            }
            
            .performance-badge {
              padding: 4px 12px;
              border-radius: 20px;
              font-size: 0.75rem;
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 0.05em;
            }
            
            .performance-badge.excellent { background: #dcfce7; color: #166534; }
            .performance-badge.good { background: #dbeafe; color: #1d4ed8; }
            .performance-badge.average { background: #fef3c7; color: #92400e; }
            .performance-badge.low { background: #fee2e2; color: #991b1b; }
            
            .priority-badge {
              padding: 4px 12px;
              border-radius: 20px;
              font-size: 0.75rem;
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              margin-left: 8px;
            }
            
            .priority-badge.high { background: #fee2e2; color: #991b1b; }
            .priority-badge.medium { background: #fef3c7; color: #92400e; }
            .priority-badge.low { background: #dbeafe; color: #1d4ed8; }
            .priority-badge.none { background: #dcfce7; color: #166534; }
            
            .employee-stats {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
              gap: 15px;
              margin-top: 20px;
            }
            
            .employee-stat {
              text-align: center;
              padding: 12px;
              background: #f8fafc;
              border-radius: 8px;
              border: 1px solid #e2e8f0;
            }
            
            .employee-stat-value {
              font-size: 1.1rem;
              font-weight: 600;
              color: #1e293b;
              display: block;
              margin-bottom: 3px;
            }
            
            .employee-stat-label {
              font-size: 0.8rem;
              color: #64748b;
              font-weight: 500;
            }
            
            /* Footer */
            .footer {
              margin-top: 50px;
              padding-top: 25px;
              border-top: 2px solid #e2e8f0;
              text-align: center;
              color: #64748b;
              font-size: 0.9rem;
            }
            
            .footer-brand {
              font-weight: 600;
              color: #1e293b;
              margin-bottom: 5px;
            }
            
            /* Print Styles */
            @media print {
              body { 
                margin: 0; 
                font-size: 12px;
              }
              .page {
                box-shadow: none;
                margin: 0;
                padding: 15mm;
                max-width: none;
              }
              .header {
                background: #667eea !important;
                -webkit-print-color-adjust: exact;
                color-adjust: exact;
              }
              .executive-summary,
              .performance-section,
              .employee-card {
                page-break-inside: avoid;
                break-inside: avoid;
              }
              .employees-section {
                page-break-before: auto;
              }
              .employee-card {
                margin-bottom: 15px;
              }
            }
            
            @page {
              margin: 15mm;
              size: A4;
            }
          </style>
        </head>
        <body>
          <div class="page">
            <!-- Header -->
            <header class="header">
              <div class="header-content">
                <h1>${reportData.title}</h1>
                <div class="subtitle">${reportData.subtitle}</div>
                <div class="meta">
                  Generated on ${reportData.date} at ${reportData.time}
                </div>
              </div>
            </header>

            <!-- Executive Summary -->
            <section class="executive-summary">
              <h2>Executive Summary</h2>
              
              <div class="kpi-grid">
                <div class="kpi-card workforce">
                  <span class="kpi-value">${reportData.summary.totalEmployees}</span>
                  <div class="kpi-label">Total Employees</div>
                </div>
                <div class="kpi-card performance">
                  <span class="kpi-value">${reportData.summary.workCompletionRate.toFixed(1)}%</span>
                  <div class="kpi-label">Completion Rate</div>
                </div>
                <div class="kpi-card earnings">
                  <span class="kpi-value">£${reportData.summary.totalEarned.toFixed(0)}</span>
                  <div class="kpi-label">Total Earned</div>
                </div>
                <div class="kpi-card outstanding">
                  <span class="kpi-value">£${reportData.summary.totalOutstanding.toFixed(0)}</span>
                  <div class="kpi-label">Outstanding</div>
                </div>
              </div>

              <div class="performance-section">
                <h3>Key Performance Indicators</h3>
                <div class="performance-metrics">
                  <div class="metric">
                    <div class="metric-label">Work Days Completed</div>
                    <div class="metric-value">${reportData.summary.totalWorkDays}</div>
                  </div>
                  <div class="metric">
                    <div class="metric-label">Days Paid</div>
                    <div class="metric-value">${reportData.summary.totalPaidDays}</div>
                  </div>
                  <div class="metric">
                    <div class="metric-label">Average Daily Wage</div>
                    <div class="metric-value">£${reportData.summary.avgDailyWage.toFixed(0)}</div>
                  </div>
                  <div class="metric">
                    <div class="metric-label">Total Payments</div>
                    <div class="metric-value">${reportData.summary.paymentCount}</div>
                  </div>
                  <div class="metric">
                    <div class="metric-label">Amount Paid</div>
                    <div class="metric-value">£${reportData.summary.totalPaid.toFixed(0)}</div>
                  </div>
                  <div class="metric">
                    <div class="metric-label">Calendar Notes</div>
                    <div class="metric-value">${reportData.summary.dayNotesCount}</div>
                  </div>
                </div>
              </div>
            </section>

            <!-- Employee Details -->
            <section class="employees-section">
              <h2>Employee Performance Analysis</h2>
              
              <div class="employee-grid">
                ${reportData.employees.map(emp => `
                  <div class="employee-card">
                    <div class="employee-header">
                      <div class="employee-info">
                        <h4>${emp.name}</h4>
                        <div class="employee-meta">
                          ${emp.email !== 'Not provided' ? `📧 ${emp.email}<br>` : ''}
                          ${emp.phone !== 'Not provided' ? `📞 ${emp.phone}<br>` : ''}
                          ${emp.startDate !== 'Not specified' ? `📅 Started: ${emp.startDate}<br>` : ''}
                          💰 Daily Wage: £${emp.dailyWage}${emp.previousWage ? ` (Previous: £${emp.previousWage})` : ''}
                        </div>
                      </div>
                      <div>
                        <span class="performance-badge ${emp.performanceRating.toLowerCase()}">${emp.performanceRating}</span>
                        ${emp.priorityLevel !== 'NONE' ? `<span class="priority-badge ${emp.priorityLevel.toLowerCase()}">${emp.priorityLevel} Priority</span>` : ''}
                      </div>
                    </div>
                    
                    <div class="employee-stats">
                      <div class="employee-stat">
                        <span class="employee-stat-value">${emp.workedDays}</span>
                        <div class="employee-stat-label">Days Worked</div>
                      </div>
                      <div class="employee-stat">
                        <span class="employee-stat-value">${emp.paidDays}</span>
                        <div class="employee-stat-label">Days Paid</div>
                      </div>
                      <div class="employee-stat">
                        <span class="employee-stat-value">£${emp.totalEarned.toFixed(0)}</span>
                        <div class="employee-stat-label">Total Earned</div>
                      </div>
                      <div class="employee-stat">
                        <span class="employee-stat-value">£${emp.totalPaid.toFixed(0)}</span>
                        <div class="employee-stat-label">Total Paid</div>
                      </div>
                      <div class="employee-stat">
                        <span class="employee-stat-value">£${emp.outstanding.toFixed(0)}</span>
                        <div class="employee-stat-label">Outstanding</div>
                      </div>
                      <div class="employee-stat">
                        <span class="employee-stat-value">${emp.paymentCount}</span>
                        <div class="employee-stat-label">Payments</div>
                      </div>
                    </div>
                    
                    ${emp.notes ? `
                      <div style="margin-top: 15px; padding: 12px; background: #f8fafc; border-radius: 6px; border-left: 3px solid #3b82f6;">
                        <div style="font-size: 0.85rem; color: #64748b; margin-bottom: 3px; font-weight: 500;">Notes:</div>
                        <div style="font-size: 0.9rem; color: #1e293b;">${emp.notes}</div>
                      </div>
                    ` : ''}
                  </div>
                `).join('')}
              </div>
            </section>

            <!-- Footer -->
            <footer class="footer">
              <div class="footer-brand">My Days Work Tracker</div>
              <div>Professional Business Report • Generated on ${new Date().toLocaleString()}</div>
              <div style="margin-top: 10px; font-size: 0.8rem;">
                This report contains confidential business information. Please handle with appropriate security measures.
              </div>
            </footer>
          </div>
        </body>
        </html>
      `

      // Create and download the HTML file
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `MyDays-Executive-Report-${new Date().toISOString().split('T')[0]}.html`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      alert('🎉 Professional PDF Report Generated!\n\n📊 FEATURES:\n• Executive dashboard with KPIs\n• Modern professional design\n• Employee performance analysis\n• Color-coded priority levels\n• Comprehensive business metrics\n• Print-optimized layout\n\n💡 TIP: Open the HTML file and use "Print to PDF" in your browser for best results!')
    } catch (error) {
      console.error('PDF export failed:', error)
      alert('PDF export failed. Please try again.')
    }
  }

  const exportToXLSX = async () => {
    try {
      // Only count work days that are in the past or today (not future)
      const today = new Date()
      today.setHours(23, 59, 59, 999) // End of today
      
      // Create a new workbook
      const wb = XLSX.utils.book_new()
      
      // Helper function to get week number
      const getWeekNumber = (date: Date) => {
        const firstDayOfYear = new Date(date.getFullYear(), 0, 1)
        const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000
        return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7)
      }
      
      // Helper function to calculate consecutive work days
      const getConsecutiveWorkDays = (empWorkDays: WorkDay[], currentDate: string) => {
        const sortedWorked = empWorkDays
          .filter(wd => wd.worked && wd.date <= currentDate)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        
        let consecutive = 0
        let expectedDate = new Date(currentDate)
        
        for (const workDay of sortedWorked) {
          const workDate = new Date(workDay.date)
          if (workDate.toDateString() === expectedDate.toDateString()) {
            consecutive++
            expectedDate.setDate(expectedDate.getDate() - 1)
          } else {
            break
          }
        }
        
        return consecutive
      }

      // WORKSHEET 1: EXECUTIVE DASHBOARD
      const dashboardData: any[][] = []
      
      // Calculate comprehensive business metrics first
      const totalWorkedDays = workDays.filter(wd => wd.worked && new Date(wd.date) <= today).length
      const totalPaidDays = workDays.filter(wd => wd.paid && new Date(wd.date) <= today).length
      const totalEarnedAllEmployees = employees.reduce((total, emp) => {
        const empWorkDays = workDays.filter(wd => wd.employeeId === emp.id && wd.worked && new Date(wd.date) <= today)
        return total + empWorkDays.reduce((empTotal, wd) => {
          if (wd.customAmount !== undefined) return empTotal + wd.customAmount
          if (emp.wageChangeDate && emp.previousWage && wd.date < emp.wageChangeDate) return empTotal + emp.previousWage
          return empTotal + emp.dailyWage
        }, 0)
      }, 0)
      const totalPaidAllEmployees = payments.reduce((sum, p) => sum + p.amount, 0)
      const totalOutstandingAllEmployees = totalEarnedAllEmployees - totalPaidAllEmployees
      const avgDailyWage = employees.length > 0 ? employees.reduce((sum, emp) => sum + emp.dailyWage, 0) / employees.length : 0
      const workCompletionRate = totalWorkedDays > 0 && totalPaidDays > 0 ? (totalPaidDays / totalWorkedDays) * 100 : 0
      
      // Build Executive Dashboard
      dashboardData.push(['MY DAYS WORK TRACKER - EXECUTIVE DASHBOARD', '', '', '', '', ''])
      dashboardData.push(['Generated:', new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }), '', '', '', ''])
      dashboardData.push(['', '', '', '', '', ''])
      
      // Key Performance Indicators
      dashboardData.push(['KEY PERFORMANCE INDICATORS', '', '', '', '', ''])
      dashboardData.push(['', '', '', '', '', ''])
      dashboardData.push(['METRIC', 'VALUE', 'TARGET', 'STATUS', 'TREND', 'NOTES'])
      dashboardData.push(['Total Employees', employees.length, '>=5', employees.length >= 5 ? 'ON TARGET' : 'BELOW', '↗', 'Active workforce'])
      dashboardData.push(['Work Completion Rate', `${workCompletionRate.toFixed(1)}%`, '>=95%', workCompletionRate >= 95 ? 'EXCELLENT' : workCompletionRate >= 80 ? 'GOOD' : 'NEEDS IMPROVEMENT', workCompletionRate >= 95 ? '↗' : '→', 'Percentage of work days paid'])
      dashboardData.push(['Total Outstanding', totalOutstandingAllEmployees, '<=1000', totalOutstandingAllEmployees <= 1000 ? 'GOOD' : 'HIGH', totalOutstandingAllEmployees <= 1000 ? '↗' : '↑', 'Amount owed to employees'])
      dashboardData.push(['Average Daily Wage', avgDailyWage, '>=100', avgDailyWage >= 100 ? 'COMPETITIVE' : 'REVIEW', '→', 'Market competitiveness'])
      dashboardData.push(['', '', '', '', '', ''])
      
      // Financial Summary
      dashboardData.push(['FINANCIAL SUMMARY', '', '', '', '', ''])
      dashboardData.push(['', '', '', '', '', ''])
      dashboardData.push(['CATEGORY', 'AMOUNT (£)', 'PERCENTAGE', 'NOTES', '', ''])
      dashboardData.push(['Total Earned', totalEarnedAllEmployees, '100%', 'Total wages earned by all employees', '', ''])
      dashboardData.push(['Total Paid', totalPaidAllEmployees, `${totalEarnedAllEmployees > 0 ? ((totalPaidAllEmployees / totalEarnedAllEmployees) * 100).toFixed(1) : 0}%`, 'Total payments made to employees', '', ''])
      dashboardData.push(['Outstanding', totalOutstandingAllEmployees, `${totalEarnedAllEmployees > 0 ? ((totalOutstandingAllEmployees / totalEarnedAllEmployees) * 100).toFixed(1) : 0}%`, 'Amount still owed to employees', '', ''])
      dashboardData.push(['', '', '', '', '', ''])
      
      // Workforce Analytics
      dashboardData.push(['WORKFORCE ANALYTICS', '', '', '', '', ''])
      dashboardData.push(['', '', '', '', '', ''])
      dashboardData.push(['EMPLOYEE', 'DAYS WORKED', 'TOTAL EARNED', 'OUTSTANDING', 'PERFORMANCE', 'STATUS'])
      employees.forEach(employee => {
        const empWorkDays = workDays.filter(wd => wd.employeeId === employee.id && wd.worked && new Date(wd.date) <= today)
        const empPayments = payments.filter(p => p.employeeId === employee.id)
        let totalEarned = 0
        for (const workDay of empWorkDays) {
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
        const totalPaid = empPayments.reduce((sum, payment) => sum + payment.amount, 0)
        const outstanding = Math.max(0, totalEarned - totalPaid)
        const performance = empWorkDays.length >= 20 ? 'HIGH' : empWorkDays.length >= 10 ? 'MEDIUM' : 'LOW'
        const status = outstanding > 500 ? 'PRIORITY' : outstanding > 0 ? 'PENDING' : 'CURRENT'
        
        dashboardData.push([employee.name, empWorkDays.length, totalEarned, outstanding, performance, status])
      })
      
      const wsDashboard = XLSX.utils.aoa_to_sheet(dashboardData)

      // WORKSHEET 2: DETAILED WORK HISTORY
      const workHistoryData: any[][] = []
      
      // Professional header row
      workHistoryData.push([
        'Employee Name', 'Contact Email', 'Phone Number', 'Employment Start', 'Current Wage (£)', 'Previous Wage (£)', 'Wage Change Date',
        'Work Date', 'Day of Week', 'Week #', 'Month', 'Year', 'Worked?', 'Paid?', 'Custom Amount?',
        'Amount Earned (£)', 'Payment Date', 'Payment Method', 'Payment Amount (£)', 'Payment Notes',
        'Work Day Notes', 'Employee Notes', 'Days Since Start', 'Days Since Last Payment', 'Consecutive Work Days',
        'Employee Total Earned (£)', 'Employee Total Paid (£)', 'Employee Outstanding (£)', 'Work Day ID', 'Payment ID'
      ])
      
      // Process each employee's detailed work data
      employees.forEach(employee => {
        const empWorkDays = workDays.filter(wd => wd.employeeId === employee.id)
        const empPayments = payments.filter(p => p.employeeId === employee.id).sort((a, b) => 
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        )
        
        // Calculate employee totals
        const workedDays = empWorkDays.filter(wd => wd.worked && new Date(wd.date) <= today)
        let totalEarned = 0
        
        // Calculate total earned
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
        
        const totalPaid = empPayments.reduce((sum, payment) => sum + payment.amount, 0)
        
        // Calculate days since start and last payment
        const startDate = employee.startDate ? new Date(employee.startDate) : null
        const daysSinceStart = startDate ? Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) : null
        const lastPayment = empPayments[empPayments.length - 1]
        const lastPaymentDate = lastPayment ? new Date(lastPayment.createdAt) : null
        const daysSinceLastPayment = lastPaymentDate ? Math.floor((today.getTime() - lastPaymentDate.getTime()) / (1000 * 60 * 60 * 24)) : null
        
        // Add detailed work day data
        empWorkDays
          .filter(wd => new Date(wd.date) <= today)
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
          .forEach(workDay => {
            const workDate = new Date(workDay.date)
            const dayOfWeek = workDate.toLocaleDateString('en-US', { weekday: 'long' })
            const weekNumber = getWeekNumber(workDate)
            const month = workDate.toLocaleDateString('en-US', { month: 'long' })
            const year = workDate.getFullYear()
            
            // Calculate amount for this day
            let dayAmount = 0
            if (workDay.worked) {
              if (workDay.customAmount !== undefined) {
                dayAmount = workDay.customAmount
              } else {
                if (employee.wageChangeDate && employee.previousWage && workDay.date < employee.wageChangeDate) {
                  dayAmount = employee.previousWage
                } else {
                  dayAmount = employee.dailyWage
                }
              }
            }
            
            // Find payment information
            const relatedPayment = empPayments.find(p => p.workDayIds.includes(workDay.id))
            const paymentDate = relatedPayment ? new Date(relatedPayment.date).toLocaleDateString() : ''
            const paymentMethod = relatedPayment ? relatedPayment.paymentType : (workDay.paid ? 'Unknown' : 'Unpaid')
            const paymentAmount = relatedPayment ? relatedPayment.amount : 0
            const paymentNotes = relatedPayment ? (relatedPayment.notes || '') : ''
            
            // Calculate consecutive work days
            const consecutiveDays = workDay.worked ? getConsecutiveWorkDays(empWorkDays, workDay.date) : 0
            
            workHistoryData.push([
              employee.name,
              employee.email || '',
              employee.phone || '',
              employee.startDate || '',
              employee.dailyWage,
              employee.previousWage || '',
              employee.wageChangeDate || '',
              workDay.date,
              dayOfWeek,
              weekNumber,
              month,
              year,
              workDay.worked ? 'YES' : 'NO',
              workDay.paid ? 'YES' : 'NO',
              workDay.customAmount !== undefined ? 'YES' : 'NO',
              dayAmount,
              paymentDate,
              paymentMethod,
              paymentAmount,
              paymentNotes,
              workDay.notes || '',
              employee.notes || '',
              daysSinceStart || '',
              daysSinceLastPayment || '',
              consecutiveDays,
              totalEarned,
              totalPaid,
              Math.max(0, totalEarned - totalPaid),
              workDay.id,
              relatedPayment ? relatedPayment.id : ''
            ])
          })
      })
      
      const wsWorkHistory = XLSX.utils.aoa_to_sheet(workHistoryData)
      
      // WORKSHEET 3: EMPLOYEE PERFORMANCE SUMMARY
      const employeeSummaryData: any[][] = []
      employeeSummaryData.push(['EMPLOYEE PERFORMANCE & PAYROLL SUMMARY', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''])
      employeeSummaryData.push(['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''])
      employeeSummaryData.push([
        'Employee Name', 'Email Address', 'Phone Number', 'Start Date', 'Current Wage (£)', 'Total Days Worked', 
        'Total Days Paid', 'Total Earned (£)', 'Total Paid (£)', 'Outstanding (£)', 'Avg Daily Earnings (£)', 
        'Payment Count', 'Avg Payment (£)', 'Last Payment Date', 'Days Since Last Payment', 'Performance Rating', 'Priority'
      ])
      
      employees.forEach(employee => {
        const empWorkDays = workDays.filter(wd => wd.employeeId === employee.id)
        const empPayments = payments.filter(p => p.employeeId === employee.id)
        const workedDays = empWorkDays.filter(wd => wd.worked && new Date(wd.date) <= today)
        const paidDays = empWorkDays.filter(wd => wd.paid && new Date(wd.date) <= today)
        
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
        
        const totalPaid = empPayments.reduce((sum, payment) => sum + payment.amount, 0)
        const outstanding = Math.max(0, totalEarned - totalPaid)
        const avgDailyEarnings = workedDays.length > 0 ? totalEarned / workedDays.length : 0
        const avgPaymentAmount = empPayments.length > 0 ? totalPaid / empPayments.length : 0
        const lastPayment = empPayments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
        const lastPaymentDate = lastPayment ? new Date(lastPayment.createdAt).toLocaleDateString() : ''
        const daysSinceLastPayment = lastPayment ? Math.floor((today.getTime() - new Date(lastPayment.createdAt).getTime()) / (1000 * 60 * 60 * 24)) : ''
        
        // Performance and priority ratings
        const performanceRating = workedDays.length >= 20 ? 'EXCELLENT' : workedDays.length >= 10 ? 'GOOD' : workedDays.length >= 5 ? 'AVERAGE' : 'LOW'
        const priority = outstanding > 1000 ? 'HIGH' : outstanding > 500 ? 'MEDIUM' : outstanding > 0 ? 'LOW' : 'NONE'
        
        employeeSummaryData.push([
          employee.name,
          employee.email || '',
          employee.phone || '',
          employee.startDate || '',
          employee.dailyWage,
          workedDays.length,
          paidDays.length,
          totalEarned,
          totalPaid,
          outstanding,
          avgDailyEarnings,
          empPayments.length,
          avgPaymentAmount,
          lastPaymentDate,
          daysSinceLastPayment,
          performanceRating,
          priority
        ])
      })
      
      // Add summary totals with formulas
      employeeSummaryData.push(['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''])
      employeeSummaryData.push(['TOTALS & AVERAGES', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''])
      employeeSummaryData.push([
        'TOTALS →',
        `${employees.length} employees`,
        '',
        '',
        `=AVERAGE(E4:E${3 + employees.length})`,
        `=SUM(F4:F${3 + employees.length})`,
        `=SUM(G4:G${3 + employees.length})`,
        `=SUM(H4:H${3 + employees.length})`,
        `=SUM(I4:I${3 + employees.length})`,
        `=SUM(J4:J${3 + employees.length})`,
        `=AVERAGE(K4:K${3 + employees.length})`,
        `=SUM(L4:L${3 + employees.length})`,
        `=AVERAGE(M4:M${3 + employees.length})`,
        '',
        `=AVERAGE(O4:O${3 + employees.length})`,
        '',
        ''
      ])
      
      const wsEmployeeSummary = XLSX.utils.aoa_to_sheet(employeeSummaryData)
      
      // WORKSHEET 4: CALENDAR & DAY NOTES
      const dayNotesData: any[][] = []
      dayNotesData.push(['CALENDAR NOTES & IMPORTANT DATES', '', '', '', '', '', '', '', ''])
      dayNotesData.push(['', '', '', '', '', '', '', '', ''])
      dayNotesData.push(['Date', 'Day of Week', 'Week #', 'Month', 'Year', 'Note Content', 'Created At', 'Category', 'Note ID'])
      
      dayNotes
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .forEach(note => {
          const noteDate = new Date(note.date)
          const dayOfWeek = noteDate.toLocaleDateString('en-US', { weekday: 'long' })
          const weekNumber = getWeekNumber(noteDate)
          const month = noteDate.toLocaleDateString('en-US', { month: 'long' })
          const year = noteDate.getFullYear()
          const createdAt = new Date(note.createdAt).toLocaleDateString('en-US', { 
            year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
          })
          
          // Categorize notes
          const category = note.note.toLowerCase().includes('holiday') ? 'HOLIDAY' :
                          note.note.toLowerCase().includes('meeting') ? 'MEETING' :
                          note.note.toLowerCase().includes('payment') ? 'PAYMENT' :
                          note.note.toLowerCase().includes('weather') ? 'WEATHER' : 'GENERAL'
          
          dayNotesData.push([
            note.date, dayOfWeek, weekNumber, month, year, note.note, createdAt, category, note.id
          ])
        })
      
      // Add summary if no notes
      if (dayNotes.length === 0) {
        dayNotesData.push(['No calendar notes recorded', '', '', '', '', '', '', '', ''])
      }
      
      const wsDayNotes = XLSX.utils.aoa_to_sheet(dayNotesData)
      
      // WORKSHEET 5: FINANCIAL CALCULATIONS & FORMULAS
      const calculationsData: any[][] = []
      
      calculationsData.push(['FINANCIAL CALCULATIONS & BUSINESS INTELLIGENCE', '', '', '', ''])
      calculationsData.push(['Automated Excel Formulas for Real-time Analysis', '', '', '', ''])
      calculationsData.push(['', '', '', '', ''])
      
      calculationsData.push(['PAYROLL CALCULATIONS', 'FORMULA', 'RESULT', 'DESCRIPTION', ''])
      calculationsData.push(['Total Employees', `=COUNTA('Employee Summary'!A4:A${3 + employees.length})-1`, employees.length, 'Count of active employees', ''])
      calculationsData.push(['Total Work Days', `=COUNTIF('Work History'!M:M,"YES")`, totalWorkedDays, 'Days where work was completed', ''])
      calculationsData.push(['Total Paid Days', `=COUNTIF('Work History'!N:N,"YES")`, totalPaidDays, 'Work days that have been paid', ''])
      calculationsData.push(['Total Earnings', `=SUM('Work History'!P:P)`, totalEarnedAllEmployees, 'Total amount earned by all employees', ''])
      calculationsData.push(['Total Payments', `=SUM('Work History'!S:S)`, totalPaidAllEmployees, 'Total amount paid to employees', ''])
      calculationsData.push(['Total Outstanding', `=SUM('Employee Summary'!J:J)`, totalOutstandingAllEmployees, 'Total amount still owed', ''])
      calculationsData.push(['', '', '', '', ''])
      
      calculationsData.push(['PERFORMANCE METRICS', 'FORMULA', 'RESULT', 'DESCRIPTION', ''])
      calculationsData.push(['Average Daily Wage', `=AVERAGE('Employee Summary'!E:E)`, avgDailyWage.toFixed(2), 'Average wage across all employees', ''])
      calculationsData.push(['Payment Completion Rate', `=(COUNTIF('Work History'!N:N,"YES")/COUNTIF('Work History'!M:M,"YES"))*100`, `${workCompletionRate.toFixed(1)}%`, 'Percentage of worked days that are paid', ''])
      calculationsData.push(['Average Days Worked per Employee', `=AVERAGE('Employee Summary'!F:F)`, (totalWorkedDays / Math.max(employees.length, 1)).toFixed(1), 'Average productivity per employee', ''])
      calculationsData.push(['Outstanding as % of Total Earned', `=(SUM('Employee Summary'!J:J)/SUM('Employee Summary'!H:H))*100`, totalEarnedAllEmployees > 0 ? `${((totalOutstandingAllEmployees / totalEarnedAllEmployees) * 100).toFixed(1)}%` : '0%', 'Outstanding debt percentage', ''])
      calculationsData.push(['', '', '', '', ''])
      
      calculationsData.push(['TOP PERFORMERS', 'FORMULA', 'RESULT', 'DESCRIPTION', ''])
      calculationsData.push(['Highest Earning Employee', `=INDEX('Employee Summary'!A:A,MATCH(MAX('Employee Summary'!H:H),'Employee Summary'!H:H,0))`, '', 'Employee with highest total earnings', ''])
      calculationsData.push(['Most Active Employee', `=INDEX('Employee Summary'!A:A,MATCH(MAX('Employee Summary'!F:F),'Employee Summary'!F:F,0))`, '', 'Employee with most work days', ''])
      calculationsData.push(['Highest Outstanding', `=INDEX('Employee Summary'!A:A,MATCH(MAX('Employee Summary'!J:J),'Employee Summary'!J:J,0))`, '', 'Employee with most outstanding payment', ''])
      calculationsData.push(['Best Paid Employee', `=INDEX('Employee Summary'!A:A,MATCH(MAX('Employee Summary'!E:E),'Employee Summary'!E:E,0))`, '', 'Employee with highest daily wage', ''])
      calculationsData.push(['', '', '', '', ''])
      
      calculationsData.push(['CASH FLOW ANALYSIS', 'FORMULA', 'RESULT', 'DESCRIPTION', ''])
      calculationsData.push(['Weekly Payroll Estimate', `=SUM('Employee Summary'!E:E)*7`, (avgDailyWage * employees.length * 7).toFixed(2), 'Estimated weekly payroll cost', ''])
      calculationsData.push(['Monthly Payroll Estimate', `=SUM('Employee Summary'!E:E)*30`, (avgDailyWage * employees.length * 30).toFixed(2), 'Estimated monthly payroll cost', ''])
      calculationsData.push(['Current Cash Liability', `=SUM('Employee Summary'!J:J)`, totalOutstandingAllEmployees.toFixed(2), 'Immediate payment obligations', ''])
      calculationsData.push(['', '', '', '', ''])
      
      calculationsData.push(['REPORT METADATA', '', '', '', ''])
      calculationsData.push(['Export Date', '=TODAY()', new Date().toLocaleDateString(), 'Date this report was generated', ''])
      calculationsData.push(['Export Time', '=NOW()', new Date().toLocaleString(), 'Time this report was generated', ''])
      calculationsData.push(['Data Range', 'All dates to present', `Through ${today.toLocaleDateString()}`, 'Period covered by this report', ''])
      calculationsData.push(['Total Records', `=COUNTA('Work History'!A:A)-1`, workHistoryData.length - 1, 'Number of work day records', ''])
      
      const wsCalculations = XLSX.utils.aoa_to_sheet(calculationsData)
      
      // Add all worksheets to workbook with professional names
      XLSX.utils.book_append_sheet(wb, wsDashboard, 'Executive Dashboard')
      XLSX.utils.book_append_sheet(wb, wsWorkHistory, 'Work History')
      XLSX.utils.book_append_sheet(wb, wsEmployeeSummary, 'Employee Summary')
      XLSX.utils.book_append_sheet(wb, wsDayNotes, 'Calendar Notes')
      XLSX.utils.book_append_sheet(wb, wsCalculations, 'Calculations')
      
      // Apply professional formatting and column widths
      // Dashboard formatting
      if (!wsDashboard['!cols']) wsDashboard['!cols'] = []
      wsDashboard['!cols'] = [
        { wch: 25 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 20 }
      ]
      
      // Work History formatting
      if (!wsWorkHistory['!cols']) wsWorkHistory['!cols'] = []
      wsWorkHistory['!cols'] = Array(30).fill(null).map((_, i) => {
        if (i === 0) return { wch: 18 } // Employee Name
        if (i === 1 || i === 2) return { wch: 20 } // Email, Phone
        if (i === 4 || i === 5) return { wch: 12 } // Wages
        if (i === 15 || i === 18 || i === 25 || i === 26 || i === 27) return { wch: 15 } // Currency columns
        return { wch: 12 }
      })
      
      // Employee Summary formatting
      if (!wsEmployeeSummary['!cols']) wsEmployeeSummary['!cols'] = []
      wsEmployeeSummary['!cols'] = [
        { wch: 18 }, { wch: 25 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
        { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 12 },
        { wch: 15 }, { wch: 15 }, { wch: 18 }, { wch: 15 }, { wch: 12 }
      ]
      
      // Day Notes formatting
      if (!wsDayNotes['!cols']) wsDayNotes['!cols'] = []
      wsDayNotes['!cols'] = [
        { wch: 12 }, { wch: 15 }, { wch: 8 }, { wch: 12 }, { wch: 8 }, 
        { wch: 40 }, { wch: 18 }, { wch: 12 }, { wch: 25 }
      ]
      
      // Calculations formatting
      if (!wsCalculations['!cols']) wsCalculations['!cols'] = []
      wsCalculations['!cols'] = [
        { wch: 25 }, { wch: 35 }, { wch: 15 }, { wch: 35 }, { wch: 5 }
      ]
      
      // Generate and download the professionally formatted Excel file
      const fileName = `MyDays-Business-Analytics-${new Date().toISOString().split('T')[0]}.xlsx`
      XLSX.writeFile(wb, fileName)
      
      alert('🎉 Professional Excel Workbook Exported Successfully!\n\n📊 INCLUDES:\n• Executive Dashboard with KPIs\n• Detailed Work History (30 columns)\n• Employee Performance Summary\n• Calendar Notes & Categories\n• Financial Calculations & Formulas\n• Auto-sum calculations\n• Professional formatting\n• Built-in Excel analytics\n\n💼 Perfect for:\n• Executive reporting\n• Payroll management\n• Financial analysis\n• Performance tracking\n• Business intelligence')
    } catch (error) {
      console.error('XLSX export failed:', error)
      alert('Excel export failed. Please try again.')
    }
  }

  const clearAllData = async () => {
    if (confirm('Are you sure you want to clear ALL data? This action cannot be undone.')) {
      if (confirm('This will delete ALL employees, work days, payments, calendar notes, and activity logs. Are you absolutely sure?')) {
        try {
          // Delete all data comprehensively
          await Promise.all([
            // Delete all employees
            ...employees.map(employee => firebaseService.deleteEmployee(employee.id)),
            // Delete all work days
            ...employees.map(employee => firebaseService.deleteWorkDaysForEmployee(employee.id)),
            // Delete ALL payments (including any orphaned ones)
            firebaseService.deleteAllPayments(),
            // Delete ALL day notes (calendar notes)
            firebaseService.deleteAllDayNotes()
          ])
          
          setEmployees([])
          setWorkDays([])
          setPayments([])
          setDayNotes([])
          setShowClearAllModal(false)
          alert('All data including employees, work days, payments, calendar notes, and activity logs has been cleared successfully.')
        } catch (error) {
          console.error('Error clearing data:', error)
          alert('Failed to clear data. Please try again.')
        }
      }
    }
  }

  const clearEmployeeData = async (employee: Employee) => {
    if (confirm(`Are you sure you want to delete ${employee.name} and all their work data including payments? This action cannot be undone.`)) {
      try {
        await firebaseService.deleteEmployee(employee.id)
        await firebaseService.deleteWorkDaysForEmployee(employee.id)
        await firebaseService.deletePaymentsForEmployee(employee.id)
        
        setEmployees(prev => prev.filter(emp => emp.id !== employee.id))
        setWorkDays(prev => prev.filter(wd => wd.employeeId !== employee.id))
        setShowEmployeeModal(false)
        setSelectedEmployee(null)
        alert(`${employee.name} and all their data including payments have been deleted successfully.`)
      } catch (error) {
        console.error('Error deleting employee:', error)
        alert('Failed to delete employee. Please try again.')
      }
    }
  }

  if (loading) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
          <div className="container mx-auto px-4 py-8 max-w-md">
            <div className="flex items-center justify-center min-h-screen">
              <div className="text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto mb-6"></div>
                <h2 className="text-xl font-semibold text-gray-800 mb-2">Loading Settings</h2>
                <p className="text-gray-600">Getting your data...</p>
              </div>
            </div>
          </div>
        </div>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard>
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="container mx-auto px-4 py-6 max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-gray-500 to-gray-700 rounded-2xl shadow-lg mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
          <p className="text-gray-600">Manage your app data and preferences</p>
        </div>

        {/* Sync Status */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-center mb-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mr-3 ${
              syncStatus === 'syncing' ? 'bg-amber-100' :
              syncStatus === 'synced' ? 'bg-emerald-100' :
              'bg-red-100'
            }`}>
              <svg className={`w-5 h-5 ${
                syncStatus === 'syncing' ? 'text-amber-600' :
                syncStatus === 'synced' ? 'text-emerald-600' :
                'text-red-600'
              }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {syncStatus === 'syncing' ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                ) : syncStatus === 'synced' ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                )}
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Sync Status</h2>
              <p className="text-sm text-gray-600">Cloud synchronization</p>
            </div>
          </div>

          <div className={`flex items-center space-x-3 p-4 rounded-xl border ${
            syncStatus === 'syncing' ? 'bg-amber-50 border-amber-200' :
            syncStatus === 'synced' ? 'bg-emerald-50 border-emerald-200' :
            'bg-red-50 border-red-200'
          }`}>
            <div className={`w-3 h-3 rounded-full ${
              syncStatus === 'syncing' ? 'bg-amber-500 animate-pulse' :
              syncStatus === 'synced' ? 'bg-emerald-500' :
              'bg-red-500'
            }`}></div>
            <div className="flex-1">
              <span className={`font-medium ${
                syncStatus === 'syncing' ? 'text-amber-800' :
                syncStatus === 'synced' ? 'text-emerald-800' :
                'text-red-800'
              }`}>
                {syncStatus === 'syncing' ? 'Syncing Data...' :
                 syncStatus === 'synced' ? 'All Data Synced' :
                 'Sync Error'}
              </span>
              {errorMessage && (
                <p className="text-sm text-red-700 mt-1">{errorMessage}</p>
              )}
            </div>
            {syncStatus === 'error' && (
              <button
                onClick={retryConnection}
                className="btn btn-sm px-3 py-1.5 text-xs font-medium rounded-lg text-red-700 bg-red-100 hover:bg-red-200 transition-colors border border-red-300"
              >
                Retry
              </button>
            )}
          </div>
        </div>

        {/* Backup & Restore */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center mr-3">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Backup & Restore</h2>
              <p className="text-sm text-gray-600">Export and import your data</p>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={exportData}
              disabled={importing}
              className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center">
                <svg className="w-5 h-5 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                </svg>
                <div className="text-left">
                  <h3 className="font-medium text-gray-900">Export Backup</h3>
                  <p className="text-sm text-gray-600">Download complete backup (employees, work days, payments, day notes)</p>
                </div>
              </div>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* Import File Input (Hidden) */}
            <input
              type="file"
              id="backup-import"
              accept=".json"
              onChange={handleFileSelect}
              className="hidden"
              disabled={importing}
            />

            <button
              onClick={() => document.getElementById('backup-import')?.click()}
              disabled={importing}
              className="w-full flex items-center justify-between p-4 border border-blue-200 rounded-xl hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center">
                <svg className="w-5 h-5 text-blue-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                </svg>
                <div className="text-left">
                  <h3 className="font-medium text-blue-900">
                    {importing ? 'Importing...' : 'Import Backup'}
                  </h3>
                  <p className="text-sm text-blue-600">
                    {importing ? 'Restoring your data...' : 'Restore data from backup file'}
                  </p>
                </div>
              </div>
              {importing ? (
                <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
            </button>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-start space-x-3">
                <svg className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div>
                  <h4 className="text-sm font-medium text-amber-800">Important</h4>
                  <p className="text-xs text-amber-700 mt-1">
                    Importing will replace ALL your current data. Make sure to export a backup first if you want to keep your current data.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={exportToCSV}
              disabled={importing}
              className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center">
                <svg className="w-5 h-5 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <div className="text-left">
                  <h3 className="font-medium text-gray-900">Export Enhanced CSV</h3>
                  <p className="text-sm text-gray-600">Detailed analytics spreadsheet (Excel, Google Sheets)</p>
                </div>
              </div>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            <button
              onClick={exportToPDF}
              disabled={importing}
              className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center">
                <svg className="w-5 h-5 text-purple-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <div className="text-left">
                  <h3 className="font-medium text-gray-900">Export Report</h3>
                  <p className="text-sm text-gray-600">Generate a PDF report</p>
                </div>
              </div>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            <button
              onClick={exportToXLSX}
              disabled={importing}
              className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center">
                <svg className="w-5 h-5 text-blue-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <div className="text-left">
                  <h3 className="font-medium text-gray-900">Export Professional Excel</h3>
                  <p className="text-sm text-gray-600">Multi-sheet workbook with formulas & analytics</p>
                </div>
              </div>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Data Management */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center mr-3">
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Data Management</h2>
              <p className="text-sm text-gray-600">Delete data and employees</p>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => setShowEmployeeModal(true)}
              className="w-full flex items-center justify-between p-4 border border-orange-200 rounded-xl hover:bg-orange-50 transition-colors"
            >
              <div className="flex items-center">
                <svg className="w-5 h-5 text-orange-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <div className="text-left">
                  <h3 className="font-medium text-orange-900">Delete Individual Employee</h3>
                  <p className="text-sm text-orange-600">Remove specific employee and their data</p>
                </div>
              </div>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            <button
              onClick={() => setShowClearAllModal(true)}
              className="w-full flex items-center justify-between p-4 border border-red-200 rounded-xl hover:bg-red-50 transition-colors"
            >
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <div className="text-left">
                  <h3 className="font-medium text-red-900">Clear All Data</h3>
                  <p className="text-sm text-red-600">Delete all employees, work records, payments & notes</p>
                </div>
              </div>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Account */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center mr-3">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Account</h2>
              <p className="text-sm text-gray-600">Account settings</p>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={async () => {
                if (confirm('Are you sure you want to sign out?')) {
                  try {
                    await firebaseService.signOut()
                    window.location.href = '/login'
                  } catch (error) {
                    console.error('Sign out error:', error)
                    alert('Failed to sign out. Please try again.')
                  }
                }
              }}
              className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center">
                <svg className="w-5 h-5 text-gray-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <div className="text-left">
                  <h3 className="font-medium text-gray-900">Sign Out</h3>
                  <p className="text-sm text-gray-600">Sign out of your account</p>
                </div>
              </div>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* About */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center mr-3">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">About</h2>
              <p className="text-sm text-gray-600">App information</p>
            </div>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Version</span>
              <span className="font-medium text-gray-900">1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Build</span>
              <span className="font-medium text-gray-900">2024.1</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Platform</span>
              <span className="font-medium text-gray-900">Web App</span>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              Did They Work? - Work Tracker
              <br />
              Built with ❤️ for efficient work management
            </p>
          </div>
        </div>
      </div>

      {/* Clear All Data Modal */}
      {showClearAllModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Clear All Data</h3>
                <p className="text-sm text-gray-600">This action cannot be undone</p>
              </div>
            </div>
            
            <p className="text-gray-700 mb-6">
              This will permanently delete all employees, work days, payment records, calendar notes, and activity logs. 
              Make sure you have exported your data before proceeding.
            </p>
            
            <div className="flex space-x-3">
              <button
                onClick={() => setShowClearAllModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={clearAllData}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors"
              >
                Clear All Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Employee Selection Modal */}
      {showEmployeeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full max-h-96 overflow-y-auto">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Select Employee</h3>
                <p className="text-sm text-gray-600">Choose employee to delete</p>
              </div>
            </div>
            
            {employees.length === 0 ? (
              <p className="text-gray-600 text-center py-8">No employees to delete</p>
            ) : (
              <div className="space-y-2">
                {employees.map(employee => (
                  <button
                    key={employee.id}
                    onClick={() => clearEmployeeData(employee)}
                    className="w-full text-left p-3 border border-gray-200 rounded-xl hover:bg-red-50 hover:border-red-200 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">{employee.name}</h4>
                        <p className="text-sm text-gray-600">£{employee.dailyWage}/day</p>
                      </div>
                      <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </div>
                  </button>
                ))}
              </div>
            )}
            
            <button
              onClick={() => setShowEmployeeModal(false)}
              className="w-full mt-4 px-4 py-2 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Report Modal */}
      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        employees={employees}
        workDays={workDays}
        payments={payments}
      />

    </div>
    </AuthGuard>
  )
}