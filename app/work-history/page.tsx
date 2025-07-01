'use client'

import { useState, useMemo } from 'react'
import { format, parseISO, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths, subDays } from 'date-fns'
import { useRouter } from 'next/navigation'
import { useAppStore } from '../../lib/store'
import { useFirebaseData } from '../../lib/hooks/useFirebaseData'
import LoadingScreen from '../components/LoadingScreen'

type WorkStatusFilter = 'all' | 'worked' | 'scheduled'
type PaymentStatusFilter = 'all' | 'paid' | 'unpaid'
type DateRangeFilter = 'all' | 'today' | 'week' | 'month' | 'last-month' | 'year' | 'custom'

export default function EmployeeReports() {
  const router = useRouter()
  const { employees, workDays, payments, loading } = useAppStore()
  
  // Filter states
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([])
  const [workStatusFilter, setWorkStatusFilter] = useState<WorkStatusFilter>('all')
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<PaymentStatusFilter>('all')
  const [dateRangeFilter, setDateRangeFilter] = useState<DateRangeFilter>('month')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  
  // Sort states
  const [sortBy, setSortBy] = useState<'date' | 'employee' | 'amount'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Initialize Firebase data loading
  useFirebaseData()

  // Get date range for filtering
  const getDateRange = () => {
    const today = new Date()
    switch (dateRangeFilter) {
      case 'today':
        return { start: today, end: today }
      case 'week':
        const weekStart = new Date(today)
        weekStart.setDate(today.getDate() - 7)
        return { start: weekStart, end: today }
      case 'month':
        return { start: startOfMonth(today), end: endOfMonth(today) }
      case 'last-month':
        const lastMonth = subMonths(today, 1)
        return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) }
      case 'year':
        return { start: startOfYear(today), end: endOfYear(today) }
      case 'custom':
        return {
          start: customStartDate ? parseISO(customStartDate) : new Date('1900-01-01'),
          end: customEndDate ? parseISO(customEndDate) : new Date('2100-12-31')
        }
      default:
        return { start: new Date('1900-01-01'), end: new Date('2100-12-31') }
    }
  }

  // Filter and sort work days
  const filteredAndSortedWorkDays = useMemo(() => {
    let filtered = workDays

    // Filter by employee
    if (selectedEmployeeIds.length > 0) {
      filtered = filtered.filter(day => selectedEmployeeIds.includes(day.employeeId))
    }

    // Filter by work status
    if (workStatusFilter !== 'all') {
      const today = new Date()
      today.setHours(23, 59, 59, 999) // End of today
      
      filtered = filtered.filter(day => {
        const dayDate = parseISO(day.date)
        
        if (workStatusFilter === 'worked') {
          // Show past days that were worked
          return dayDate <= today && day.worked
        } else if (workStatusFilter === 'scheduled') {
          // Show future days (scheduled/upcoming shifts)
          return dayDate > today
        }
        return true
      })
    }

    // Filter by payment status
    if (paymentStatusFilter !== 'all') {
      filtered = filtered.filter(day => 
        paymentStatusFilter === 'paid' ? day.paid : !day.paid
      )
    }

    // Filter by date range
    if (dateRangeFilter !== 'all') {
      const { start, end } = getDateRange()
      filtered = filtered.filter(day => {
        const dayDate = parseISO(day.date)
        return dayDate >= start && dayDate <= end
      })
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      let compareValue = 0
      if (sortBy === 'date') {
        compareValue = new Date(a.date).getTime() - new Date(b.date).getTime()
      } else if (sortBy === 'employee') {
        const empA = employees.find(emp => emp.id === a.employeeId)
        const empB = employees.find(emp => emp.id === b.employeeId)
        compareValue = (empA?.name || '').localeCompare(empB?.name || '')
      } else if (sortBy === 'amount') {
        const amountA = getWorkDayAmount(a)
        const amountB = getWorkDayAmount(b)
        compareValue = amountA - amountB
      }
      return sortOrder === 'desc' ? -compareValue : compareValue
    })
    return sorted
  }, [workDays, selectedEmployeeIds, workStatusFilter, paymentStatusFilter, dateRangeFilter, customStartDate, customEndDate, sortBy, sortOrder, employees])

  const getWorkDayAmount = (workDay: any) => {
    const employee = employees.find(emp => emp.id === workDay.employeeId)
    if (!employee) return 0
    if (workDay.customAmount !== undefined) return workDay.customAmount
    if (employee.wageChangeDate && employee.previousWage && workDay.date < employee.wageChangeDate) {
      return employee.previousWage
    }
    return employee.dailyWage
  }

  const getEmployeeName = (employeeId: string) => {
    const employee = employees.find(emp => emp.id === employeeId)
    return employee?.name || 'Unknown Employee'
  }

  const getRelatedPayment = (workDay: any) => {
    return payments.find(payment => payment.workDayIds.includes(workDay.id))
  }

  const toggleEmployeeFilter = (employeeId: string) => {
    setSelectedEmployeeIds(prev => 
      prev.includes(employeeId) 
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    )
  }

  const selectAllEmployees = () => {
    setSelectedEmployeeIds(employees.map(emp => emp.id))
  }

  const clearEmployeeFilters = () => {
    setSelectedEmployeeIds([])
  }

  const clearAllFilters = () => {
    setSelectedEmployeeIds([])
    setWorkStatusFilter('all')
    setPaymentStatusFilter('all')
    setDateRangeFilter('month')
    setCustomStartDate('')
    setCustomEndDate('')
  }

  // Calculate summary stats for the display (based on fully filtered data)
  const summaryStats = useMemo(() => {
    const today = new Date()
    today.setHours(23, 59, 59, 999) // End of today
    
    const totalWorkDays = filteredAndSortedWorkDays.length
    // Worked = past days that were actually worked
    const workedDays = filteredAndSortedWorkDays.filter(day => {
      const dayDate = parseISO(day.date)
      return dayDate <= today && day.worked
    })
    // Scheduled = future days (upcoming shifts)
    const scheduledDays = filteredAndSortedWorkDays.filter(day => {
      const dayDate = parseISO(day.date)
      return dayDate > today
    })
    const paidDays = filteredAndSortedWorkDays.filter(day => day.paid)
    const unpaidDays = filteredAndSortedWorkDays.filter(day => !day.paid)
    
    const totalAmount = filteredAndSortedWorkDays.reduce((sum, day) => sum + getWorkDayAmount(day), 0)
    const paidAmount = paidDays.reduce((sum, day) => sum + getWorkDayAmount(day), 0)
    const unpaidAmount = unpaidDays.reduce((sum, day) => sum + getWorkDayAmount(day), 0)

    return { 
      totalWorkDays, 
      workedDays: workedDays.length,
      scheduledDays: scheduledDays.length,
      paidDays: paidDays.length, 
      unpaidDays: unpaidDays.length, 
      totalAmount, 
      paidAmount, 
      unpaidAmount 
    }
  }, [filteredAndSortedWorkDays])

  // Show loading screen after all hooks have been called
  if (loading) {
    return <LoadingScreen />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header with Back Button */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center px-3 py-2 mb-4 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Employee Reports</h1>
            <p className="text-gray-600 mt-1">Track work schedules, payments, and performance across your team</p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-1">{summaryStats.workedDays}</div>
              <div className="text-sm text-gray-600">Days Worked</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-1">{summaryStats.scheduledDays}</div>
              <div className="text-sm text-gray-600">Upcoming Shifts</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-amber-600 mb-1">{summaryStats.unpaidDays}</div>
              <div className="text-sm text-gray-600">Unpaid</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900 mb-1">£{summaryStats.totalAmount.toFixed(0)}</div>
              <div className="text-sm text-gray-600">Total Value</div>
            </div>
          </div>
        </div>

        {/* Filters Section */}
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
            <button
              onClick={clearAllFilters}
              className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Clear All
            </button>
          </div>

          {/* Employee Selection */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-gray-700">Select Employees</label>
              <div className="flex space-x-2">
                <button 
                  onClick={selectAllEmployees} 
                  className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 transition-colors"
                >
                  Select All
                </button>
                <button 
                  onClick={clearEmployeeFilters} 
                  className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded hover:bg-gray-200 transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {employees.map(employee => {
                const isSelected = selectedEmployeeIds.includes(employee.id)
                return (
                  <button
                    key={employee.id}
                    onClick={() => toggleEmployeeFilter(employee.id)}
                    className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                      isSelected ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {employee.name}
                  </button>
                )
              })}
            </div>
            {selectedEmployeeIds.length === 0 && (
              <p className="text-sm text-gray-500 mt-2">All employees selected</p>
            )}
          </div>

          {/* Filter Options */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Work Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Work Status</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: 'all', label: 'All' },
                  { value: 'worked', label: 'Worked' },
                  { value: 'scheduled', label: 'Scheduled' }
                ].map(option => (
                  <button
                    key={option.value}
                    onClick={() => setWorkStatusFilter(option.value as WorkStatusFilter)}
                    className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                      workStatusFilter === option.value 
                        ? 'bg-green-600 text-white' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Payment Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Payment Status</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: 'all', label: 'All' },
                  { value: 'paid', label: 'Paid' },
                  { value: 'unpaid', label: 'Unpaid' }
                ].map(option => (
                  <button
                    key={option.value}
                    onClick={() => setPaymentStatusFilter(option.value as PaymentStatusFilter)}
                    className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                      paymentStatusFilter === option.value 
                        ? 'bg-amber-600 text-white' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Date Range Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
              <select
                value={dateRangeFilter}
                onChange={(e) => setDateRangeFilter(e.target.value as DateRangeFilter)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">Last 7 Days</option>
                <option value="month">This Month</option>
                <option value="last-month">Last Month</option>
                <option value="year">This Year</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>
          </div>

          {/* Custom Date Range */}
          {dateRangeFilter === 'custom' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* Sort Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sort by</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'date' | 'employee' | 'amount')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="date">Date</option>
                <option value="employee">Employee</option>
                <option value="amount">Amount</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Order</label>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="desc">Newest First</option>
                <option value="asc">Oldest First</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              Work Records ({filteredAndSortedWorkDays.length} entries)
            </h2>
          </div>

          {filteredAndSortedWorkDays.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Records Found</h3>
              <p className="text-gray-600">Try adjusting your filters to see more results.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredAndSortedWorkDays.map(workDay => {
                const relatedPayment = getRelatedPayment(workDay)
                const employee = employees.find(emp => emp.id === workDay.employeeId)
                
                // Determine status based on date and work status
                const today = new Date()
                today.setHours(23, 59, 59, 999)
                const dayDate = parseISO(workDay.date)
                const isFuture = dayDate > today
                
                let statusColor = 'bg-blue-100 text-blue-800'
                let statusText = 'Scheduled'
                
                if (isFuture) {
                  statusColor = 'bg-blue-100 text-blue-800'
                  statusText = 'Scheduled'
                } else if (workDay.worked && workDay.paid) {
                  statusColor = 'bg-green-100 text-green-800'
                  statusText = 'Completed & Paid'
                } else if (workDay.worked && !workDay.paid) {
                  statusColor = 'bg-amber-100 text-amber-800'
                  statusText = 'Worked, Unpaid'
                } else {
                  statusColor = 'bg-gray-100 text-gray-800'
                  statusText = 'Not Worked'
                }
                
                return (
                  <div 
                    key={workDay.id}
                    className="p-6 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => router.push(`/employee/${workDay.employeeId}`)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                          <span className="text-white font-bold">
                            {getEmployeeName(workDay.employeeId).charAt(0).toUpperCase()}
                          </span>
                        </div>

                        <div>
                          <h3 className="font-semibold text-gray-900 text-lg">
                            {getEmployeeName(workDay.employeeId)}
                          </h3>
                          <p className="text-gray-600 text-sm">
                            {format(parseISO(workDay.date), 'EEEE, MMMM d, yyyy')}
                          </p>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColor}`}>
                              {statusText}
                            </span>
                            {workDay.notes && (
                              <span className="text-xs text-gray-500 italic">"{workDay.notes}"</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900">
                          £{getWorkDayAmount(workDay).toFixed(2)}
                        </div>
                        {workDay.customAmount !== undefined && (
                          <div className="text-xs text-blue-600">Custom rate</div>
                        )}
                        {relatedPayment && workDay.paid && (
                          <div className="text-xs text-gray-500 mt-1">
                            Paid on {format(parseISO(relatedPayment.date), 'MMM d')}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
