'use client'

import { useState } from 'react'
import { format, parseISO, differenceInDays } from 'date-fns'
import { useBodyScrollLock } from '../../lib/hooks/useBodyScrollLock'

// PDF generation imports
import jsPDF from 'jspdf'
import 'jspdf-autotable'

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF
  }
}

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

interface ReportModalProps {
  isOpen: boolean
  onClose: () => void
  employees: Employee[]
  workDays: WorkDay[]
  payments: Payment[]
}

export default function ReportModal({
  isOpen,
  onClose,
  employees,
  workDays,
  payments
}: ReportModalProps) {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([])
  const [reportType, setReportType] = useState<'summary' | 'detailed' | 'payments'>('summary')
  const [isGenerating, setIsGenerating] = useState(false)
  
  // Prevent background scrolling when modal is open
  useBodyScrollLock(isOpen)

  if (!isOpen) return null

  const generateReport = () => {
    if (!startDate || !endDate) return null

    const filteredWorkDays = workDays.filter(wd => {
      const workDate = new Date(wd.date)
      const start = new Date(startDate)
      const end = new Date(endDate)
      const isInRange = workDate >= start && workDate <= end
      const isSelectedEmployee = selectedEmployees.length === 0 || selectedEmployees.includes(wd.employeeId)
      return isInRange && isSelectedEmployee
    })

    const filteredPayments = payments.filter(p => {
      const paymentDate = new Date(p.date)
      const start = new Date(startDate)
      const end = new Date(endDate)
      const isInRange = paymentDate >= start && paymentDate <= end
      const isSelectedEmployee = selectedEmployees.length === 0 || selectedEmployees.includes(p.employeeId)
      return isInRange && isSelectedEmployee
    })

    const relevantEmployees = employees.filter(emp => 
      selectedEmployees.length === 0 || selectedEmployees.includes(emp.id)
    )

    return {
      workDays: filteredWorkDays,
      payments: filteredPayments,
      employees: relevantEmployees
    }
  }

  const reportData = generateReport()

  const toggleEmployeeSelection = (employeeId: string) => {
    setSelectedEmployees(prev => 
      prev.includes(employeeId) 
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    )
  }

  const selectAllEmployees = () => {
    setSelectedEmployees(employees.map(emp => emp.id))
  }

  const clearEmployeeSelection = () => {
    setSelectedEmployees([])
  }

  const exportToCSV = () => {
    if (!reportData) return

    let csvContent = ''
    
    if (reportType === 'summary') {
      csvContent = 'Employee Name,Days Worked,Days Paid,Total Earned,Total Outstanding\n'
      reportData.employees.forEach(emp => {
        const empWorkDays = reportData.workDays.filter(wd => wd.employeeId === emp.id)
        const workedDays = empWorkDays.filter(wd => wd.worked).length
        const paidDays = empWorkDays.filter(wd => wd.paid).length
        const totalEarned = workedDays * emp.dailyWage
        const totalOutstanding = totalEarned - (paidDays * emp.dailyWage)
        
        csvContent += `"${emp.name}",${workedDays},${paidDays},£${totalEarned.toFixed(2)},£${totalOutstanding.toFixed(2)}\n`
      })
    } else if (reportType === 'detailed') {
      csvContent = 'Employee Name,Date,Worked,Paid,Daily Wage\n'
      reportData.workDays.forEach(wd => {
        const emp = employees.find(e => e.id === wd.employeeId)
        if (emp) {
          csvContent += `"${emp.name}","${wd.date}","${wd.worked ? 'Yes' : 'No'}","${wd.paid ? 'Yes' : 'No'}",£${emp.dailyWage}\n`
        }
      })
    } else if (reportType === 'payments') {
      csvContent = 'Employee Name,Payment Date,Amount,Payment Type,Notes\n'
      reportData.payments.forEach(payment => {
        const emp = employees.find(e => e.id === payment.employeeId)
        if (emp) {
          csvContent += `"${emp.name}","${payment.date}",£${payment.amount.toFixed(2)},"${payment.paymentType}","${payment.notes || ''}"\n`
        }
      })
    }

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `work-report-${startDate}-to-${endDate}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const exportToPDF = async () => {
    if (!reportData) return

    setIsGenerating(true)

    try {
      const doc = new jsPDF()
      const pageWidth = doc.internal.pageSize.width
      const pageHeight = doc.internal.pageSize.height
      const margin = 20
      
      // Header
      doc.setFontSize(20)
      doc.setTextColor(40, 40, 40)
      doc.text('Did They Work? - Work Report', margin, 30)
      
      // Report info
      doc.setFontSize(12)
      doc.setTextColor(100, 100, 100)
      doc.text(`Report Type: ${reportType.charAt(0).toUpperCase() + reportType.slice(1)}`, margin, 45)
      doc.text(`Period: ${format(new Date(startDate), 'MMM d, yyyy')} - ${format(new Date(endDate), 'MMM d, yyyy')}`, margin, 55)
      doc.text(`Generated: ${format(new Date(), 'MMM d, yyyy - h:mm a')}`, margin, 65)
      
      let yPosition = 80

      if (reportType === 'summary') {
        const tableData = reportData.employees.map(emp => {
          const empWorkDays = reportData.workDays.filter(wd => wd.employeeId === emp.id)
          const workedDays = empWorkDays.filter(wd => wd.worked)
          const paidDays = empWorkDays.filter(wd => wd.paid)
          
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
          const empPayments = reportData.payments.filter(p => p.employeeId === emp.id)
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
          
          const totalOutstanding = totalEarned - paidAmount
          
          return [
            emp.name,
            workedDays.length.toString(),
            paidDays.length.toString(),
            `£${totalEarned.toFixed(2)}`,
            `£${totalOutstanding.toFixed(2)}`
          ]
        })

        doc.autoTable({
          head: [['Employee', 'Days Worked', 'Days Paid', 'Total Earned', 'Outstanding']],
          body: tableData,
          startY: yPosition,
          theme: 'striped',
          styles: {
            fontSize: 10,
            cellPadding: 5
          },
          headStyles: {
            fillColor: [79, 70, 229],
            textColor: 255,
            fontStyle: 'bold'
          },
          columnStyles: {
            3: { halign: 'right' },
            4: { halign: 'right' }
          }
        })

      } else if (reportType === 'detailed') {
        const tableData = reportData.workDays.map(wd => {
          const emp = employees.find(e => e.id === wd.employeeId)
          return emp ? [
            emp.name,
            format(new Date(wd.date), 'MMM d, yyyy'),
            wd.worked ? 'Yes' : 'No',
            wd.paid ? 'Yes' : 'No',
            `£${emp.dailyWage}`
          ] : []
        }).filter(row => row.length > 0)

        doc.autoTable({
          head: [['Employee', 'Date', 'Worked', 'Paid', 'Daily Wage']],
          body: tableData,
          startY: yPosition,
          theme: 'striped',
          styles: {
            fontSize: 9,
            cellPadding: 4
          },
          headStyles: {
            fillColor: [79, 70, 229],
            textColor: 255,
            fontStyle: 'bold'
          },
          columnStyles: {
            4: { halign: 'right' }
          }
        })

      } else if (reportType === 'payments') {
        const tableData = reportData.payments.map(payment => {
          const emp = employees.find(e => e.id === payment.employeeId)
          return emp ? [
            emp.name,
            format(new Date(payment.date), 'MMM d, yyyy'),
            `£${payment.amount.toFixed(2)}`,
            payment.paymentType,
            payment.notes || ''
          ] : []
        }).filter(row => row.length > 0)

        doc.autoTable({
          head: [['Employee', 'Date', 'Amount', 'Type', 'Notes']],
          body: tableData,
          startY: yPosition,
          theme: 'striped',
          styles: {
            fontSize: 9,
            cellPadding: 4
          },
          headStyles: {
            fillColor: [79, 70, 229],
            textColor: 255,
            fontStyle: 'bold'
          },
          columnStyles: {
            2: { halign: 'right' }
          }
        })
      }

      // Generate PDF blob
      const pdfBlob = doc.output('blob')
      const fileName = `my-days-report-${startDate}-to-${endDate}.pdf`

      // Try to use Web Share API for mobile sharing
      if (navigator.share && navigator.canShare) {
        try {
          const file = new File([pdfBlob], fileName, { type: 'application/pdf' })
          
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              title: 'Did They Work? Work Report',
              text: `Work report from ${format(new Date(startDate), 'MMM d, yyyy')} to ${format(new Date(endDate), 'MMM d, yyyy')}`,
              files: [file]
            })
            return // Successfully shared
          }
        } catch (shareError) {
          console.log('Web Share failed, falling back to download:', shareError)
        }
      }

      // Fallback: Traditional download
      const url = window.URL.createObjectURL(pdfBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('Error generating PDF report. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-800">Generate Report</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {/* Report Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Date Range */}
            <div>
              <h3 className="text-lg font-medium text-gray-700 mb-3">Date Range</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            </div>

            {/* Report Type */}
            <div>
              <h3 className="text-lg font-medium text-gray-700 mb-3">Report Type</h3>
              <div className="space-y-2">
                {[
                  { value: 'summary', label: 'Summary Report', desc: 'Overview of work and payments' },
                  { value: 'detailed', label: 'Detailed Report', desc: 'Day-by-day breakdown' },
                  { value: 'payments', label: 'Payment Report', desc: 'Payment history only' }
                ].map(option => (
                  <label key={option.value} className="flex items-start space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="reportType"
                      value={option.value}
                      checked={reportType === option.value}
                      onChange={(e) => setReportType(e.target.value as any)}
                      className="mt-1"
                    />
                    <div>
                      <div className="font-medium text-gray-700">{option.label}</div>
                      <div className="text-sm text-gray-500">{option.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Employee Selection */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-medium text-gray-700">Employees</h3>
              <div className="flex space-x-2">
                <button
                  onClick={selectAllEmployees}
                  className="text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded-md hover:bg-blue-200 transition-colors"
                >
                  Select All
                </button>
                <button
                  onClick={clearEmployeeSelection}
                  className="text-sm bg-gray-100 text-gray-800 px-3 py-1 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-32 overflow-y-auto">
              {employees.map(emp => (
                <label key={emp.id} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedEmployees.includes(emp.id)}
                    onChange={() => toggleEmployeeSelection(emp.id)}
                  />
                  <span className="text-sm text-gray-700">{emp.name}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {selectedEmployees.length === 0 ? 'All employees selected' : `${selectedEmployees.length} employee(s) selected`}
            </p>
          </div>

          {/* Report Preview */}
          {reportData && startDate && endDate && (
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-700 mb-3">Report Preview</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-blue-600">
                      {reportData.employees.length}
                    </div>
                    <div className="text-sm text-gray-600">Employees</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">
                      {reportData.workDays.filter(wd => wd.worked).length}
                    </div>
                    <div className="text-sm text-gray-600">Work Days</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-yellow-600">
                      {reportData.payments.length}
                    </div>
                    <div className="text-sm text-gray-600">Payments</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-purple-600">
                      £{reportData.payments.reduce((sum, p) => sum + p.amount, 0).toFixed(0)}
                    </div>
                    <div className="text-sm text-gray-600">Total Paid</div>
                  </div>
                </div>

                {reportType === 'summary' && (
                  <div className="mt-4">
                    <h4 className="font-medium text-gray-700 mb-2">Employee Summary</h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {reportData.employees.map(emp => {
                        const empWorkDays = reportData.workDays.filter(wd => wd.employeeId === emp.id)
                        const workedDays = empWorkDays.filter(wd => wd.worked)
                        const paidDays = empWorkDays.filter(wd => wd.paid)
                        
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
                        const empPayments = reportData.payments.filter(p => p.employeeId === emp.id)
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
                        
                        const totalOutstanding = totalEarned - paidAmount
                        
                        return (
                          <div key={emp.id} className="flex justify-between items-center bg-white rounded p-2 text-sm">
                            <span className="font-medium">{emp.name}</span>
                            <div className="flex space-x-4 text-xs">
                              <span>{workedDays.length} worked</span>
                              <span>{paidDays.length} paid</span>
                              <span className={totalOutstanding > 0 ? 'text-red-600 font-medium' : 'text-green-600'}>
                                £{totalOutstanding.toFixed(0)} owed
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={exportToCSV}
              disabled={!reportData || !startDate || !endDate}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Export CSV
            </button>
            <button
              onClick={exportToPDF}
              disabled={!reportData || !startDate || !endDate || isGenerating}
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {isGenerating ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clipRule="evenodd" />
                  </svg>
                  Export PDF
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
} 