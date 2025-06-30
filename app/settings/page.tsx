'use client'

import { useState, useEffect } from 'react'
import { firebaseService } from '../../lib/firebase'
import { useAppStore } from '../../lib/store'

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

export default function Settings() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [workDays, setWorkDays] = useState<WorkDay[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
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
        const [employeesData, workDaysData, paymentsData] = await Promise.all([
          firebaseService.getEmployees(),
          firebaseService.getWorkDays(),
          firebaseService.getPayments()
        ])
        
        setEmployees(employeesData as Employee[])
        setWorkDays(workDaysData as WorkDay[])
        setPayments(paymentsData as Payment[])
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
        summary: {
          totalEmployees: employees.length,
          totalWorkDays: workDays.length,
          totalPayments: payments.length,
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
      
      alert('Complete backup exported successfully! This includes all employees, work days, and payment records.')
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
      
      // Additional validation
      const importedEmployees = data.employees as Employee[]
      const importedWorkDays = data.workDays as WorkDay[]
      const importedPayments = data.payments as Payment[]
      
      // Validate employee structure
      for (const emp of importedEmployees) {
        if (!emp.id || !emp.name || typeof emp.dailyWage !== 'number') {
          throw new Error('Invalid employee data structure in backup file')
        }
      }
      
      // Confirm with user before clearing existing data
      const confirmMessage = `This will replace ALL your current data with the backup data.\n\nBackup contains:\n• ${importedEmployees.length} employees\n• ${importedWorkDays.length} work days\n• ${importedPayments.length} payments\n\nYour current data will be permanently deleted. Continue?`
      
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
        firebaseService.deleteAllPayments()
      ])
      
      // Import new data
      await Promise.all([
        // Import employees
        ...importedEmployees.map(employee => firebaseService.addEmployee(employee)),
        // Import work days
        ...importedWorkDays.map(workDay => firebaseService.addWorkDay(workDay)),
        // Import payments
        ...importedPayments.map(payment => firebaseService.addPayment(payment))
      ])
      
      // Update local state
      setEmployees(importedEmployees)
      setWorkDays(importedWorkDays)
      setPayments(importedPayments)
      
      alert(`Data imported successfully!\n\n• ${importedEmployees.length} employees\n• ${importedWorkDays.length} work days\n• ${importedPayments.length} payments\n\nAll data has been restored from the backup.`)
      
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

  const exportToPDF = async () => {
    try {
      // Only count work days that are in the past or today (not future)
      const today = new Date()
      today.setHours(23, 59, 59, 999) // End of today
      
      // Create a simple PDF-like report
      const reportData = {
        title: 'Did They Work? - Work Tracking Report',
        date: new Date().toLocaleDateString(),
        employees: employees.map(emp => {
          const empWorkDays = workDays.filter(wd => wd.employeeId === emp.id)
          const workedDays = empWorkDays.filter(wd => wd.worked && new Date(wd.date) <= today)
          const paidDays = empWorkDays.filter(wd => wd.paid && new Date(wd.date) <= today)
          
          // Calculate total earned properly accounting for custom amounts and wage changes
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
          
          // Calculate actual paid amount from payment records for this employee in the date range
          const empPayments = payments.filter(p => p.employeeId === emp.id)
          const actualPaidAmount = empPayments.reduce((sum, payment) => sum + payment.amount, 0)
          
          // Use paid amount if available, otherwise calculate from work days
          let paidAmount = actualPaidAmount
          if (paidAmount === 0) {
            for (const workDay of paidDays) {
              if (workDay.customAmount !== undefined) {
                paidAmount += workDay.customAmount
              } else {
                if (emp.wageChangeDate && emp.previousWage && workDay.date < emp.wageChangeDate) {
                  paidAmount += emp.previousWage
                } else {
                  paidAmount += emp.dailyWage
                }
              }
            }
          }
          
          return {
            name: emp.name,
            dailyWage: emp.dailyWage,
            workedDays: workedDays.length,
            paidDays: paidDays.length,
            totalEarned,
            outstanding: totalEarned - paidAmount
          }
        }),
        summary: {
          totalEmployees: employees.length,
          totalWorkDays: workDays.filter(wd => wd.worked && new Date(wd.date) <= today).length,
          totalPaidDays: workDays.filter(wd => wd.paid && new Date(wd.date) <= today).length,
          totalOutstanding: employees.reduce((total, emp) => {
            const empWorkDays = workDays.filter(wd => wd.employeeId === emp.id)
            const workedDays = empWorkDays.filter(wd => wd.worked && new Date(wd.date) <= today)
            const paidDays = empWorkDays.filter(wd => wd.paid && new Date(wd.date) <= today)
            
            // Calculate total earned properly accounting for custom amounts and wage changes
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
            
            // Calculate actual paid amount from payment records for this employee
            const empPayments = payments.filter(p => p.employeeId === emp.id)
            const actualPaidAmount = empPayments.reduce((sum, payment) => sum + payment.amount, 0)
            
            // Use paid amount if available, otherwise calculate from work days
            let paidAmount = actualPaidAmount
            if (paidAmount === 0) {
              for (const workDay of paidDays) {
                if (workDay.customAmount !== undefined) {
                  paidAmount += workDay.customAmount
                } else {
                  if (emp.wageChangeDate && emp.previousWage && workDay.date < emp.wageChangeDate) {
                    paidAmount += emp.previousWage
                  } else {
                    paidAmount += emp.dailyWage
                  }
                }
              }
            }
            
            return total + (totalEarned - paidAmount)
          }, 0)
        }
      }

      // Create HTML content for the report
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Did They Work? Report</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 20px; 
              line-height: 1.6;
              color: #333;
            }
            .header { 
              text-align: center; 
              margin-bottom: 30px; 
              border-bottom: 2px solid #e5e7eb;
              padding-bottom: 20px;
            }
            .header h1 {
              color: #1f2937;
              margin-bottom: 10px;
            }
            .summary { 
              background: #f9fafb; 
              padding: 20px; 
              border-radius: 8px; 
              margin-bottom: 30px; 
              border: 1px solid #e5e7eb;
            }
            .summary h2 {
              color: #1f2937;
              margin-bottom: 15px;
            }
            .employee { 
              border: 1px solid #e5e7eb; 
              margin: 15px 0; 
              padding: 20px; 
              border-radius: 8px; 
              background: white;
            }
            .employee h3 {
              color: #1f2937;
              margin-bottom: 10px;
              border-bottom: 1px solid #e5e7eb;
              padding-bottom: 10px;
            }
            .stats { 
              display: grid; 
              grid-template-columns: repeat(4, 1fr); 
              gap: 15px; 
              margin-top: 15px; 
            }
            .stat { 
              text-align: center; 
              padding: 15px; 
              background: #f9fafb; 
              border-radius: 6px; 
              border: 1px solid #e5e7eb;
            }
            .stat strong {
              display: block;
              font-size: 1.2em;
              color: #1f2937;
              margin-bottom: 5px;
            }
            .footer {
              margin-top: 30px;
              text-align: center;
              color: #6b7280;
              font-size: 0.9em;
              border-top: 1px solid #e5e7eb;
              padding-top: 20px;
            }
            @media print { 
              body { margin: 0; }
              .header { page-break-after: avoid; }
              .summary { page-break-after: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${reportData.title}</h1>
            <p><strong>Generated on:</strong> ${reportData.date}</p>
          </div>
          
          <div class="summary">
            <h2>Business Summary</h2>
            <div class="stats">
              <div class="stat">
                <strong>${reportData.summary.totalEmployees}</strong>
                Total Employees
              </div>
              <div class="stat">
                <strong>${reportData.summary.totalWorkDays}</strong>
                Work Days Logged
              </div>
              <div class="stat">
                <strong>${reportData.summary.totalPaidDays}</strong>
                Days Paid
              </div>
              <div class="stat">
                <strong>£${reportData.summary.totalOutstanding.toFixed(2)}</strong>
                Total Outstanding
              </div>
            </div>
          </div>
          
          <h2>Employee Details</h2>
          ${reportData.employees.map(emp => `
            <div class="employee">
              <h3>${emp.name}</h3>
              <p><strong>Daily Wage:</strong> £${emp.dailyWage}</p>
              <div class="stats">
                <div class="stat">
                  <strong>${emp.workedDays}</strong>
                  Days Worked
                </div>
                <div class="stat">
                  <strong>${emp.paidDays}</strong>
                  Days Paid
                </div>
                <div class="stat">
                  <strong>£${emp.totalEarned.toFixed(2)}</strong>
                  Total Earned
                </div>
                <div class="stat">
                  <strong>£${emp.outstanding.toFixed(2)}</strong>
                  Outstanding
                </div>
              </div>
            </div>
          `).join('')}
          
          <div class="footer">
            <p>Did They Work? - Work Tracker Report</p>
            <p>Generated on ${new Date().toLocaleString()}</p>
          </div>
        </body>
        </html>
      `

      // Create and download the HTML file
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `my-days-report-${new Date().toISOString().split('T')[0]}.html`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      alert('PDF report generated! Open the downloaded HTML file and use "Print to PDF" in your browser.')
    } catch (error) {
      console.error('PDF export failed:', error)
      alert('PDF export failed. Please try again.')
    }
  }

  const clearAllData = async () => {
    if (confirm('Are you sure you want to clear ALL data? This action cannot be undone.')) {
      if (confirm('This will delete ALL employees, work days, payments, and activity logs. Are you absolutely sure?')) {
        try {
          // Delete all data comprehensively
          await Promise.all([
            // Delete all employees
            ...employees.map(employee => firebaseService.deleteEmployee(employee.id)),
            // Delete all work days
            ...employees.map(employee => firebaseService.deleteWorkDaysForEmployee(employee.id)),
            // Delete ALL payments (including any orphaned ones)
            firebaseService.deleteAllPayments()
          ])
          
          setEmployees([])
          setWorkDays([])
          setShowClearAllModal(false)
          alert('All data including activity logs has been cleared successfully.')
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
          <p className="text-gray-600">Manage your app preferences and data</p>
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
              <p className="text-sm text-gray-600">Data synchronization with cloud</p>
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
              <p className="text-sm text-gray-600">Export and import your complete data</p>
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
                  <p className="text-sm text-gray-600">Download complete backup (employees, work days, payments)</p>
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
              onClick={exportToPDF}
              disabled={importing}
              className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center">
                <svg className="w-5 h-5 text-purple-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <div className="text-left">
                  <h3 className="font-medium text-gray-900">Export Report (PDF)</h3>
                  <p className="text-sm text-gray-600">Generate a professional PDF report</p>
                </div>
              </div>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Data Management - Deletion Options */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center mr-3">
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Data Management</h2>
              <p className="text-sm text-gray-600">Delete employees and data</p>
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
                  <p className="text-sm text-red-600">Delete all employees and records</p>
                </div>
              </div>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Account Management */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center mr-3">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Account</h2>
              <p className="text-sm text-gray-600">Manage your account settings</p>
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

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center mr-3">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
              <p className="text-sm text-gray-600">Fast access to key features</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleNavigate('/add-employee')}
              className="flex flex-col items-center p-4 border border-gray-200 rounded-xl hover:bg-blue-50 hover:border-blue-200 transition-colors"
            >
              <svg className="w-6 h-6 text-blue-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              <span className="text-sm font-medium text-gray-900">Add Employee</span>
            </button>
            
            <button
              onClick={() => setShowReportModal(true)}
              className="flex flex-col items-center p-4 border border-gray-200 rounded-xl hover:bg-green-50 hover:border-green-200 transition-colors"
            >
              <svg className="w-6 h-6 text-green-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span className="text-sm font-medium text-gray-900">View Reports</span>
            </button>

            <button
              onClick={() => handleNavigate('/activity-log')}
              className="flex flex-col items-center p-4 border border-gray-200 rounded-xl hover:bg-orange-50 hover:border-orange-200 transition-colors"
            >
              <svg className="w-6 h-6 text-orange-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-sm font-medium text-gray-900">Activity Log</span>
            </button>

            <button
              onClick={() => handleNavigate('/')}
              className="flex flex-col items-center p-4 border border-gray-200 rounded-xl hover:bg-purple-50 hover:border-purple-200 transition-colors"
            >
              <svg className="w-6 h-6 text-purple-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v3H8V5z" />
              </svg>
              <span className="text-sm font-medium text-gray-900">Dashboard</span>
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
              <p className="text-sm text-gray-600">App information and support</p>
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
              This will permanently delete all employees, work days, payment records, and activity logs. 
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