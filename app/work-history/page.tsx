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

export default function WorkHistory() {
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
  
  // UI states
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)

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
      filtered = filtered.filter(day => 
        workStatusFilter === 'worked' ? day.worked : !day.worked
      )
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
    setDateRangeFilter('all')
    setCustomStartDate('')
    setCustomEndDate('')
  }

  // Calculate filter counts based on employee selection only (not other filters)
  const filterCounts = useMemo(() => {
    let baseFilteredDays = workDays
    
    // Apply only employee filter for counts
    if (selectedEmployeeIds.length > 0) {
      baseFilteredDays = baseFilteredDays.filter(day => selectedEmployeeIds.includes(day.employeeId))
    }
    
    const totalDays = baseFilteredDays.length
    const workedDays = baseFilteredDays.filter(day => day.worked).length
    const scheduledDays = baseFilteredDays.filter(day => !day.worked).length
    const paidDays = baseFilteredDays.filter(day => day.paid).length
    const unpaidDays = baseFilteredDays.filter(day => !day.paid).length
    
    return { totalDays, workedDays, scheduledDays, paidDays, unpaidDays }
  }, [workDays, selectedEmployeeIds])

  // Calculate summary stats for the display cards (based on fully filtered data)
  const summaryStats = useMemo(() => {
    const totalWorkDays = filteredAndSortedWorkDays.length
    const workedDays = filteredAndSortedWorkDays.filter(day => day.worked)
    const scheduledDays = filteredAndSortedWorkDays.filter(day => !day.worked)
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
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 relative overflow-hidden">
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-blue-400 to-purple-600 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-pink-400 to-indigo-600 rounded-full mix-blend-multiply filter blur-xl animate-pulse" style={{animationDelay: '2s'}}></div>
        <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-gradient-to-br from-green-400 to-blue-600 rounded-full mix-blend-multiply filter blur-xl animate-pulse" style={{animationDelay: '4s'}}></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.back()}
              className="inline-flex items-center px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all duration-200 group"
            >
              <svg className="w-4 h-4 mr-2 group-hover:-translate-x-0.5 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="font-medium">Back</span>
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Work History</h1>
              <p className="text-gray-600 mt-1">Complete history of all work days across all employees</p>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-white/50 p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{summaryStats.totalWorkDays}</div>
            <div className="text-sm text-gray-600">Total Days</div>
          </div>
          <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-white/50 p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{summaryStats.workedDays}</div>
            <div className="text-sm text-gray-600">Worked</div>
          </div>
          <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-white/50 p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{summaryStats.scheduledDays}</div>
            <div className="text-sm text-gray-600">Scheduled</div>
          </div>
          <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-white/50 p-4 text-center">
            <div className="text-2xl font-bold text-emerald-600">{summaryStats.paidDays}</div>
            <div className="text-sm text-gray-600">Paid</div>
          </div>
          <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-white/50 p-4 text-center">
            <div className="text-2xl font-bold text-amber-600">{summaryStats.unpaidDays}</div>
            <div className="text-sm text-gray-600">Unpaid</div>
          </div>
          <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-white/50 p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">£{summaryStats.totalAmount.toFixed(0)}</div>
            <div className="text-sm text-gray-600">Total Value</div>
          </div>
        </div>

        {/* Advanced Filters */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-800">Filters</h3>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="text-sm bg-blue-100 text-blue-800 px-3 py-1.5 rounded-lg hover:bg-blue-200 transition-colors"
              >
                {showAdvancedFilters ? 'Hide Advanced' : 'Show Advanced'}
              </button>
              <button
                onClick={clearAllFilters}
                className="text-sm bg-gray-100 text-gray-800 px-3 py-1.5 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Clear All
              </button>
            </div>
          </div>

          {/* Employee Filter */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">Filter by Employee</label>
              <div className="flex space-x-2">
                <button 
                  onClick={selectAllEmployees} 
                  className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded hover:bg-blue-200 transition-colors"
                >
                  Select All
                </button>
                <button 
                  onClick={clearEmployeeFilters} 
                  className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded hover:bg-gray-200 transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {employees.map(employee => {
                const isSelected = selectedEmployeeIds.includes(employee.id)
                const employeeWorkDays = workDays.filter(day => day.employeeId === employee.id).length
                
                return (
                  <button
                    key={employee.id}
                    onClick={() => toggleEmployeeFilter(employee.id)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isSelected ? 'bg-purple-600 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {employee.name} ({employeeWorkDays})
                  </button>
                )
              })}
            </div>
            {selectedEmployeeIds.length === 0 && (
              <p className="text-sm text-gray-500 mt-2">All employees selected</p>
            )}
          </div>

          {/* Quick Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {/* Work Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Work Status</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: 'all', label: 'All Days', count: filterCounts.totalDays },
                  { value: 'worked', label: 'Worked', count: filterCounts.workedDays },
                  { value: 'scheduled', label: 'Scheduled', count: filterCounts.scheduledDays }
                ].map(option => (
                  <button
                    key={option.value}
                    onClick={() => setWorkStatusFilter(option.value as WorkStatusFilter)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      workStatusFilter === option.value 
                        ? 'bg-blue-600 text-white shadow-md' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {option.label} ({option.count})
                  </button>
                ))}
              </div>
            </div>

            {/* Payment Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Payment Status</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: 'all', label: 'All', count: filterCounts.totalDays },
                  { value: 'paid', label: 'Paid', count: filterCounts.paidDays },
                  { value: 'unpaid', label: 'Unpaid', count: filterCounts.unpaidDays }
                ].map(option => (
                  <button
                    key={option.value}
                    onClick={() => setPaymentStatusFilter(option.value as PaymentStatusFilter)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      paymentStatusFilter === option.value 
                        ? 'bg-green-600 text-white shadow-md' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {option.label} ({option.count})
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

          {/* Advanced Filters */}
          {showAdvancedFilters && (
            <div className="border-t border-gray-200 pt-6 space-y-6">
              {/* Custom Date Range */}
              {dateRangeFilter === 'custom' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          )}
        </div>

        {/* Work History List */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              Work History ({filteredAndSortedWorkDays.length} days)
            </h2>
          </div>

          {filteredAndSortedWorkDays.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Work Days Found</h3>
              <p className="text-gray-600">No work days found for the selected filters.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredAndSortedWorkDays.map(workDay => {
                const relatedPayment = getRelatedPayment(workDay)
                const employee = employees.find(emp => emp.id === workDay.employeeId)
                
                // Determine status color and background
                let statusColor = 'bg-purple-50 border-purple-200 hover:bg-purple-100'
                let statusIndicator = 'bg-purple-500'
                let statusText = 'Scheduled'
                let statusTextColor = 'text-purple-700'
                
                if (workDay.worked && workDay.paid) {
                  statusColor = 'bg-green-50 border-green-200 hover:bg-green-100'
                  statusIndicator = 'bg-green-500'
                  statusText = 'Worked & Paid'
                  statusTextColor = 'text-green-700'
                } else if (workDay.worked && !workDay.paid) {
                  statusColor = 'bg-blue-50 border-blue-200 hover:bg-blue-100'
                  statusIndicator = 'bg-blue-500'
                  statusText = 'Worked & Unpaid'
                  statusTextColor = 'text-blue-700'
                }
                
                return (
                  <div 
                    key={workDay.id}
                    className={`p-4 rounded-lg border transition-all cursor-pointer hover:shadow-md ${statusColor}`}
                    onClick={() => router.push(`/employee/${workDay.employeeId}`)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-lg flex items-center justify-center shadow-sm">
                          <span className="text-white font-bold text-sm">
                            {getEmployeeName(workDay.employeeId).charAt(0).toUpperCase()}
                          </span>
                        </div>

                        <div>
                          <div className="flex items-center space-x-3">
                            <h3 className="font-semibold text-gray-900">
                              {getEmployeeName(workDay.employeeId)}
                            </h3>
                            <span className="text-gray-300">•</span>
                            <span className="text-sm font-medium text-gray-700">
                              {format(parseISO(workDay.date), 'EEEE, MMM d, yyyy')}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2 mt-1">
                            <div className={`w-2 h-2 rounded-full ${statusIndicator}`}></div>
                            <span className={`text-xs font-medium ${statusTextColor}`}>
                              {statusText}
                            </span>
                            {workDay.worked && workDay.paid && relatedPayment && (
                              <>
                                <span className="text-gray-300">•</span>
                                <span className="text-xs text-gray-600">
                                  Paid on {format(parseISO(relatedPayment.date), 'MMM d')}
                                </span>
                              </>
                            )}
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
                        <div className="font-bold text-gray-900 text-lg">
                          £{getWorkDayAmount(workDay).toFixed(2)}
                        </div>
                        {workDay.customAmount !== undefined && (
                          <div className="text-xs text-blue-600">Custom rate</div>
                        )}
                        {employee && (
                          <div className="text-xs text-gray-500 mt-1">
                            £{employee.dailyWage}/day standard
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
