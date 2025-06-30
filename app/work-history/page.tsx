'use client'

import { useState, useMemo } from 'react'
import { format, parseISO } from 'date-fns'
import { useRouter } from 'next/navigation'
import { useAppStore } from '../../lib/store'

export default function WorkHistory() {
  const router = useRouter()
  const { employees, workDays, payments } = useAppStore()
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<'date' | 'employee' | 'amount'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Get all past worked days (not future scheduled work)
  const pastWorkedDays = useMemo(() => {
    const today = new Date()
    today.setHours(23, 59, 59, 999)
    return workDays.filter(day => day.worked && new Date(day.date) <= today)
  }, [workDays])

  // Filter and sort work days
  const filteredAndSortedWorkDays = useMemo(() => {
    let filtered = pastWorkedDays
    if (selectedEmployeeIds.length > 0) {
      filtered = filtered.filter(day => selectedEmployeeIds.includes(day.employeeId))
    }

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
  }, [pastWorkedDays, selectedEmployeeIds, sortBy, sortOrder, employees])

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

  const summaryStats = useMemo(() => {
    const totalWorkDays = filteredAndSortedWorkDays.length
    const totalPaidDays = filteredAndSortedWorkDays.filter(day => day.paid).length
    const totalUnpaidDays = totalWorkDays - totalPaidDays
    const totalAmount = filteredAndSortedWorkDays.reduce((sum, day) => sum + getWorkDayAmount(day), 0)
    const totalPaidAmount = filteredAndSortedWorkDays.filter(day => day.paid).reduce((sum, day) => sum + getWorkDayAmount(day), 0)
    const totalOutstanding = totalAmount - totalPaidAmount

    return { totalWorkDays, totalPaidDays, totalUnpaidDays, totalAmount, totalPaidAmount, totalOutstanding }
  }, [filteredAndSortedWorkDays])

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 relative overflow-hidden">
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-blue-400 to-purple-600 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-pink-400 to-indigo-600 rounded-full mix-blend-multiply filter blur-xl animate-pulse" style={{animationDelay: '2s'}}></div>
        <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-gradient-to-br from-green-400 to-blue-600 rounded-full mix-blend-multiply filter blur-xl animate-pulse" style={{animationDelay: '4s'}}></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-6 max-w-7xl">
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
              <p className="text-gray-600 mt-1">Complete history of all worked days across all employees</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-white/50 p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{summaryStats.totalWorkDays}</div>
            <div className="text-sm text-gray-600">Total Days</div>
          </div>
          <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-white/50 p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{summaryStats.totalPaidDays}</div>
            <div className="text-sm text-gray-600">Paid</div>
          </div>
          <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-white/50 p-4 text-center">
            <div className="text-2xl font-bold text-amber-600">{summaryStats.totalUnpaidDays}</div>
            <div className="text-sm text-gray-600">Unpaid</div>
          </div>
          <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-white/50 p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">£{summaryStats.totalAmount.toFixed(0)}</div>
            <div className="text-sm text-gray-600">Total Earned</div>
          </div>
          <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-white/50 p-4 text-center">
            <div className="text-2xl font-bold text-green-600">£{summaryStats.totalPaidAmount.toFixed(0)}</div>
            <div className="text-sm text-gray-600">Total Paid</div>
          </div>
          <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-white/50 p-4 text-center">
            <div className={`text-2xl font-bold ${summaryStats.totalOutstanding > 0 ? 'text-amber-600' : 'text-green-600'}`}>
              £{summaryStats.totalOutstanding.toFixed(0)}
            </div>
            <div className="text-sm text-gray-600">Outstanding</div>
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-6 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Filter by Employee</h3>
              <div className="flex flex-wrap gap-2 mb-4">
                <button onClick={selectAllEmployees} className="text-sm bg-blue-100 text-blue-800 px-3 py-1.5 rounded-lg hover:bg-blue-200 transition-colors">
                  Select All
                </button>
                <button onClick={clearEmployeeFilters} className="text-sm bg-gray-100 text-gray-800 px-3 py-1.5 rounded-lg hover:bg-gray-200 transition-colors">
                  Clear All
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {employees.map(employee => {
                  const isSelected = selectedEmployeeIds.includes(employee.id)
                  const employeeWorkDays = pastWorkedDays.filter(day => day.employeeId === employee.id).length
                  
                  return (
                    <button
                      key={employee.id}
                      onClick={() => toggleEmployeeFilter(employee.id)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isSelected ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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

            <div className="lg:w-64">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Sort</h3>
              <div className="space-y-3">
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
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              Work History ({filteredAndSortedWorkDays.length} days)
            </h2>
            <div className="flex items-center space-x-4 text-xs">
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span>Paid</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                <span>Unpaid</span>
              </div>
            </div>
          </div>

          {filteredAndSortedWorkDays.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Work History Found</h3>
              <p className="text-gray-600">No worked days found for the selected filters.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredAndSortedWorkDays.map(workDay => {
                const relatedPayment = getRelatedPayment(workDay)
                const employee = employees.find(emp => emp.id === workDay.employeeId)
                
                return (
                  <div 
                    key={workDay.id}
                    className={`p-4 rounded-lg border transition-all cursor-pointer hover:shadow-md ${
                      workDay.paid ? 'bg-green-50 border-green-200 hover:bg-green-100' : 'bg-amber-50 border-amber-200 hover:bg-amber-100'
                    }`}
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
                            <div className={`w-2 h-2 rounded-full ${workDay.paid ? 'bg-green-500' : 'bg-amber-500'}`}></div>
                            <span className={`text-xs font-medium ${workDay.paid ? 'text-green-700' : 'text-amber-700'}`}>
                              {workDay.paid ? 'Paid' : 'Unpaid'}
                            </span>
                            {workDay.paid && relatedPayment && (
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
                                <span className="text-xs text-blue-600">"{workDay.notes}"</span>
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
