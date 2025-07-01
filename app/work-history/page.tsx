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
  const [dateRangeFilter, setDateRangeFilter] = useState<DateRangeFilter>('all')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  
  // Sort states
  const [sortBy, setSortBy] = useState<'date' | 'employee' | 'amount'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  
  // View state
  const [viewMode, setViewMode] = useState<'workdays' | 'payments'>('workdays')

  // Initialize Firebase data loading
  useFirebaseData()

  // Get date range for filtering
  const getDateRange = () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0) // Reset to start of day
    
    switch (dateRangeFilter) {
      case 'today':
        const endOfToday = new Date(today)
        endOfToday.setHours(23, 59, 59, 999)
        return { start: today, end: endOfToday }
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
        // Reset time to start of day for fair comparison
        const startOfDay = new Date(start)
        startOfDay.setHours(0, 0, 0, 0)
        const endOfDay = new Date(end)
        endOfDay.setHours(23, 59, 59, 999)
        return dayDate >= startOfDay && dayDate <= endOfDay
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

  // Filter and sort payments
  const filteredAndSortedPayments = useMemo(() => {
    let filtered = payments

    // Filter by employee
    if (selectedEmployeeIds.length > 0) {
      filtered = filtered.filter(payment => selectedEmployeeIds.includes(payment.employeeId))
    }

    // Filter by date range
    if (dateRangeFilter !== 'all') {
      const { start, end } = getDateRange()
      filtered = filtered.filter(payment => {
        const paymentDate = parseISO(payment.date)
        const startOfDay = new Date(start)
        startOfDay.setHours(0, 0, 0, 0)
        const endOfDay = new Date(end)
        endOfDay.setHours(23, 59, 59, 999)
        return paymentDate >= startOfDay && paymentDate <= endOfDay
      })
    }

    // Sort payments
    const sorted = [...filtered].sort((a, b) => {
      let compareValue = 0
      if (sortBy === 'date') {
        compareValue = new Date(a.date).getTime() - new Date(b.date).getTime()
      } else if (sortBy === 'employee') {
        const empA = employees.find(emp => emp.id === a.employeeId)
        const empB = employees.find(emp => emp.id === b.employeeId)
        compareValue = (empA?.name || '').localeCompare(empB?.name || '')
      } else if (sortBy === 'amount') {
        compareValue = a.amount - b.amount
      }
      return sortOrder === 'desc' ? -compareValue : compareValue
    })
    return sorted
  }, [payments, selectedEmployeeIds, dateRangeFilter, customStartDate, customEndDate, sortBy, sortOrder, employees])

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
    setDateRangeFilter('all')
    setCustomStartDate('')
    setCustomEndDate('')
    setViewMode('workdays')
  }

  // Calculate summary stats for the display (based on fully filtered data)
  const summaryStats = useMemo(() => {
    if (viewMode === 'payments') {
      // Payment stats
      const totalPayments = filteredAndSortedPayments.length
      const totalPaid = filteredAndSortedPayments.reduce((sum, payment) => sum + payment.amount, 0)
      const uniqueEmployees = new Set(filteredAndSortedPayments.map(p => p.employeeId)).size
      
      return {
        totalPayments,
        uniqueEmployees,
        totalPaid,
        workedDays: 0,
        unpaidDays: 0,
        totalAmount: totalPaid
      }
    } else {
      // Work day stats
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
    }
  }, [filteredAndSortedWorkDays, filteredAndSortedPayments, viewMode])

  // Show loading screen after all hooks have been called
  if (loading) {
    return <LoadingScreen />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 relative overflow-hidden">
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-blue-400 to-purple-600 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-pink-400 to-indigo-600 rounded-full mix-blend-multiply filter blur-xl animate-pulse" style={{animationDelay: '2s'}}></div>
        <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-gradient-to-br from-green-400 to-blue-600 rounded-full mix-blend-multiply filter blur-xl animate-pulse" style={{animationDelay: '4s'}}></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-6 max-w-7xl">
        {/* Header with Back Button */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center px-4 py-2 mb-4 text-gray-600 hover:text-gray-900 hover:bg-white/50 rounded-xl transition-all duration-200 group backdrop-blur-sm"
          >
            <svg className="w-4 h-4 mr-2 group-hover:-translate-x-0.5 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Employee Reports</h1>
            <p className="text-gray-600 mt-1">Track work schedules, payments, and performance across your team</p>
          </div>
        </div>

        {/* Colorful Stats Cards */}
        <div className="grid grid-cols-3 gap-4 mb-8 max-w-3xl mx-auto">
          {viewMode === 'workdays' ? (
            <>
              <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-white/50 p-4 text-center aspect-square flex flex-col justify-center">
                <div className="w-12 h-12 mx-auto rounded-xl bg-blue-100 flex items-center justify-center mb-3">
                  <span className="text-xl">💼</span>
                </div>
                <div className="text-2xl font-bold text-blue-600 mb-1">{summaryStats.workedDays}</div>
                <div className="text-xs text-gray-600 font-medium">Days Worked</div>
              </div>
              <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-white/50 p-4 text-center aspect-square flex flex-col justify-center">
                <div className="w-12 h-12 mx-auto rounded-xl bg-amber-100 flex items-center justify-center mb-3">
                  <span className="text-xl">⏳</span>
                </div>
                <div className="text-2xl font-bold text-amber-600 mb-1">{summaryStats.unpaidDays}</div>
                <div className="text-xs text-gray-600 font-medium">Unpaid</div>
              </div>
              <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-white/50 p-4 text-center aspect-square flex flex-col justify-center">
                <div className="w-12 h-12 mx-auto rounded-xl bg-purple-100 flex items-center justify-center mb-3">
                  <span className="text-xl">💰</span>
                </div>
                <div className="text-2xl font-bold text-purple-600 mb-1">£{summaryStats.totalAmount.toFixed(0)}</div>
                <div className="text-xs text-gray-600 font-medium">Total Value</div>
              </div>
            </>
          ) : (
            <>
              <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-white/50 p-4 text-center aspect-square flex flex-col justify-center">
                <div className="w-12 h-12 mx-auto rounded-xl bg-green-100 flex items-center justify-center mb-3">
                  <span className="text-xl">💳</span>
                </div>
                <div className="text-2xl font-bold text-green-600 mb-1">{summaryStats.totalPayments}</div>
                <div className="text-xs text-gray-600 font-medium">Total Payments</div>
              </div>
              <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-white/50 p-4 text-center aspect-square flex flex-col justify-center">
                <div className="w-12 h-12 mx-auto rounded-xl bg-blue-100 flex items-center justify-center mb-3">
                  <span className="text-xl">👥</span>
                </div>
                <div className="text-2xl font-bold text-blue-600 mb-1">{summaryStats.uniqueEmployees}</div>
                <div className="text-xs text-gray-600 font-medium">Employees Paid</div>
              </div>
              <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-white/50 p-4 text-center aspect-square flex flex-col justify-center">
                <div className="w-12 h-12 mx-auto rounded-xl bg-purple-100 flex items-center justify-center mb-3">
                  <span className="text-xl">💰</span>
                </div>
                <div className="text-2xl font-bold text-purple-600 mb-1">£{summaryStats.totalAmount.toFixed(0)}</div>
                <div className="text-xs text-gray-600 font-medium">Amount Paid</div>
              </div>
            </>
          )}
        </div>

        {/* View Toggle */}
        <div className="flex justify-center mb-6">
          <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-white/50 p-1">
            <div className="flex space-x-1">
              <button
                onClick={() => setViewMode('workdays')}
                className={`px-6 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                  viewMode === 'workdays'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                }`}
              >
                📅 Work Days
              </button>
              <button
                onClick={() => setViewMode('payments')}
                className={`px-6 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                  viewMode === 'payments'
                    ? 'bg-green-600 text-white shadow-md'
                    : 'text-gray-600 hover:text-green-600 hover:bg-green-50'
                }`}
              >
                💳 Payments
              </button>
            </div>
          </div>
        </div>

        {/* Filters Section */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-6 mb-8 max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-800">Filters</h3>
            <div className="flex items-center space-x-3">
              {/* Sort Dropdown */}
              <div className="flex items-center space-x-2">
                <label className="text-sm text-gray-600">Sort:</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'date' | 'employee' | 'amount')}
                  className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg border-none focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="date">Date</option>
                  <option value="employee">Employee</option>
                  <option value="amount">Amount</option>
                </select>
              </div>
              <button
                onClick={clearAllFilters}
                className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Clear All
              </button>
            </div>
          </div>

          {/* Employee Selection */}
          <div className="mb-6 text-center">
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Employees</label>
            <div className="flex flex-wrap gap-2 justify-center">
              <button
                onClick={() => setSelectedEmployeeIds([])}
                className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                  selectedEmployeeIds.length === 0 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              {employees.map(employee => {
                const isSelected = selectedEmployeeIds.includes(employee.id)
                return (
                  <button
                    key={employee.id}
                    onClick={() => toggleEmployeeFilter(employee.id)}
                    className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                      isSelected ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {employee.name}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Filter Options */}
          <div className={`grid grid-cols-1 ${viewMode === 'workdays' ? 'lg:grid-cols-3' : 'lg:grid-cols-1'} gap-6 mb-6 text-center`}>
            {/* Work Status Filter - Only show for work days view */}
            {viewMode === 'workdays' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Work Status</label>
                <div className="flex flex-wrap gap-2 justify-center">
                  {[
                    { value: 'all', label: 'All', color: 'bg-gray-100 text-gray-700' },
                    { value: 'worked', label: 'Worked', color: 'bg-green-100 text-green-700' },
                    { value: 'scheduled', label: 'Scheduled', color: 'bg-blue-100 text-blue-700' }
                  ].map(option => (
                    <button
                      key={option.value}
                      onClick={() => setWorkStatusFilter(option.value as WorkStatusFilter)}
                      className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                        workStatusFilter === option.value 
                          ? 'bg-green-600 text-white shadow-md' 
                          : option.color + ' hover:bg-opacity-80'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Payment Status Filter - Only show for work days view */}
            {viewMode === 'workdays' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Status</label>
                <div className="flex flex-wrap gap-2 justify-center">
                  {[
                    { value: 'all', label: 'All', color: 'bg-gray-100 text-gray-700' },
                    { value: 'paid', label: 'Paid', color: 'bg-green-100 text-green-700' },
                    { value: 'unpaid', label: 'Unpaid', color: 'bg-amber-100 text-amber-700' }
                  ].map(option => (
                    <button
                      key={option.value}
                      onClick={() => setPaymentStatusFilter(option.value as PaymentStatusFilter)}
                      className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                        paymentStatusFilter === option.value 
                          ? 'bg-amber-600 text-white shadow-md' 
                          : option.color + ' hover:bg-opacity-80'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Date Range Filter - Show for both views */}
            <div className={viewMode === 'payments' ? 'max-w-sm mx-auto' : ''}>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
              <select
                value={dateRangeFilter}
                onChange={(e) => setDateRangeFilter(e.target.value as DateRangeFilter)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
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


        </div>

        {/* Results */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              {viewMode === 'workdays' 
                ? `Work Records (${filteredAndSortedWorkDays.length} entries)`
                : `Payment Records (${filteredAndSortedPayments.length} entries)`
              }
            </h2>
          </div>

          {viewMode === 'workdays' ? (
            /* Work Days View */
            filteredAndSortedWorkDays.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Work Records Found</h3>
                <p className="text-gray-600">Try adjusting your filters to see more results.</p>
              </div>
            ) : (
              <div className="space-y-3 p-6">
                {filteredAndSortedWorkDays.map(workDay => {
                  const relatedPayment = getRelatedPayment(workDay)
                  const employee = employees.find(emp => emp.id === workDay.employeeId)
                  
                  // Determine status based on date and work status
                  const today = new Date()
                  today.setHours(23, 59, 59, 999)
                  const dayDate = parseISO(workDay.date)
                  const isFuture = dayDate > today
                  
                  let statusColor = 'bg-blue-50 border-blue-200 hover:bg-blue-100'
                  let statusIndicator = 'bg-blue-500'
                  let statusText = 'Scheduled'
                  let statusTextColor = 'text-blue-700'
                  
                  if (isFuture) {
                    statusColor = 'bg-blue-50 border-blue-200 hover:bg-blue-100'
                    statusIndicator = 'bg-blue-500'
                    statusText = 'Scheduled'
                    statusTextColor = 'text-blue-700'
                  } else if (workDay.worked && workDay.paid) {
                    statusColor = 'bg-green-50 border-green-200 hover:bg-green-100'
                    statusIndicator = 'bg-green-500'
                    statusText = 'Completed & Paid'
                    statusTextColor = 'text-green-700'
                  } else if (workDay.worked && !workDay.paid) {
                    statusColor = 'bg-amber-50 border-amber-200 hover:bg-amber-100'
                    statusIndicator = 'bg-amber-500'
                    statusText = 'Worked, Unpaid'
                    statusTextColor = 'text-amber-700'
                  } else {
                    statusColor = 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                    statusIndicator = 'bg-gray-500'
                    statusText = 'Not Worked'
                    statusTextColor = 'text-gray-700'
                  }
                  
                  return (
                    <div 
                      key={workDay.id}
                      className={`p-4 rounded-lg border transition-all cursor-pointer hover:shadow-md ${statusColor}`}
                      onClick={() => router.push(`/employee/${workDay.employeeId}`)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-lg flex items-center justify-center shadow-sm">
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
                              <div className={`w-2 h-2 rounded-full ${statusIndicator}`}></div>
                              <span className={`text-xs font-medium ${statusTextColor}`}>
                                {statusText}
                              </span>
                              {workDay.notes && (
                                <>
                                  <span className="text-gray-300">•</span>
                                  <span className="text-xs text-indigo-600">"{workDay.notes}"</span>
                                </>
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
            )
          ) : (
            /* Payments View */
            filteredAndSortedPayments.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Payment Records Found</h3>
                <p className="text-gray-600">Try adjusting your filters to see more results.</p>
              </div>
            ) : (
              <div className="space-y-3 p-6">
                {filteredAndSortedPayments.map(payment => {
                  const employee = employees.find(emp => emp.id === payment.employeeId)
                  const relatedWorkDays = workDays.filter(wd => payment.workDayIds.includes(wd.id))
                  
                  return (
                    <div 
                      key={payment.id}
                      className="p-4 rounded-lg border bg-green-50 border-green-200 hover:bg-green-100 transition-all cursor-pointer hover:shadow-md"
                      onClick={() => router.push(`/employee/${payment.employeeId}`)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center shadow-sm">
                            <span className="text-white font-bold">
                              {getEmployeeName(payment.employeeId).charAt(0).toUpperCase()}
                            </span>
                          </div>

                          <div>
                            <h3 className="font-semibold text-gray-900 text-lg">
                              {getEmployeeName(payment.employeeId)}
                            </h3>
                            <p className="text-gray-600 text-sm">
                              Payment made on {format(parseISO(payment.date), 'EEEE, MMMM d, yyyy')}
                            </p>
                            <div className="flex items-center space-x-2 mt-1">
                              <div className="w-2 h-2 rounded-full bg-green-500"></div>
                              <span className="text-xs font-medium text-green-700">
                                {payment.paymentType}
                              </span>
                              {relatedWorkDays.length > 0 && (
                                <>
                                  <span className="text-gray-300">•</span>
                                  <span className="text-xs text-gray-600">
                                    {relatedWorkDays.length} work day{relatedWorkDays.length !== 1 ? 's' : ''}: {relatedWorkDays.map(wd => format(parseISO(wd.date), 'MMM d')).join(', ')}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-2xl font-bold text-green-600">
                            £{payment.amount.toFixed(2)}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Payment Amount
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  )
}
