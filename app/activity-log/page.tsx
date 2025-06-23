'use client'

import { useState, useEffect } from 'react'
import { format, parseISO, differenceInDays, differenceInHours, differenceInMinutes } from 'date-fns'
import { firebaseService } from '../../lib/firebase'
import type { Employee, WorkDay, Payment } from '../../lib/store'
import BottomNavigation from '../components/BottomNavigation'

interface ActivityLogEntry {
  id: string
  type: 'employee_created' | 'employee_updated' | 'employee_deleted' | 'work_day_added' | 'work_day_removed' | 'payment_created' | 'payment_updated' | 'payment_deleted' | 'wage_changed'
  timestamp: string
  employeeId: string
  employeeName: string
  description: string
  details?: any
  icon: string
  color: string
}

export default function ActivityLog() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [workDays, setWorkDays] = useState<WorkDay[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    loadData()
  }, [])

  const handleNavigate = (path: string) => {
    window.location.href = path
  }

  const loadData = async () => {
    try {
      setLoading(true)
      const [employeesData, workDaysData, paymentsData] = await Promise.all([
        firebaseService.getEmployees(),
        firebaseService.getWorkDays(),
        firebaseService.getPayments()
      ])

      setEmployees(employeesData as Employee[])
      setWorkDays(workDaysData as WorkDay[])
      setPayments(paymentsData as Payment[])

      // Generate activity log from available data
      generateActivityLog(employeesData as Employee[], workDaysData as WorkDay[], paymentsData as Payment[])
    } catch (error) {
      console.error('Error loading activity log data:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateActivityLog = (employees: Employee[], workDays: WorkDay[], payments: Payment[]) => {
    const activities: ActivityLogEntry[] = []

    // Employee activities (based on creation timestamps in IDs)
    employees.forEach(employee => {
      const createdTime = new Date(parseInt(employee.id)).toISOString()
      activities.push({
        id: `emp-created-${employee.id}`,
        type: 'employee_created',
        timestamp: createdTime,
        employeeId: employee.id,
        employeeName: employee.name,
        description: `Employee "${employee.name}" was added`,
        details: { dailyWage: employee.dailyWage },
        icon: '👤',
        color: 'blue'
      })

      // Check for wage changes (if notes contain wage change info)
      if (employee.notes?.includes('Wage changed')) {
        const wageChangeMatch = employee.notes.match(/Wage changed from £([\d.]+)\/day to £([\d.]+)\/day on (.+)/g)
        if (wageChangeMatch) {
          wageChangeMatch.forEach(match => {
            const parts = match.match(/Wage changed from £([\d.]+)\/day to £([\d.]+)\/day on (.+)/)
            if (parts) {
              activities.push({
                id: `wage-change-${employee.id}-${Date.now()}`,
                type: 'wage_changed',
                timestamp: new Date().toISOString(), // Approximate timestamp
                employeeId: employee.id,
                employeeName: employee.name,
                description: `Wage changed from £${parts[1]}/day to £${parts[2]}/day`,
                details: { oldWage: parseFloat(parts[1]), newWage: parseFloat(parts[2]) },
                icon: '💰',
                color: 'green'
              })
            }
          })
        }
      }
    })

    // Work day activities
    workDays.forEach(workDay => {
      if (workDay.worked) {
        const employee = employees.find(e => e.id === workDay.employeeId)
        const workDate = new Date(workDay.date + 'T12:00:00').toISOString()
        
        activities.push({
          id: `work-${workDay.id}`,
          type: 'work_day_added',
          timestamp: workDate,
          employeeId: workDay.employeeId,
          employeeName: employee?.name || 'Unknown Employee',
          description: `Work day recorded for ${format(parseISO(workDay.date), 'MMM d, yyyy')}`,
          details: { date: workDay.date, paid: workDay.paid },
          icon: '📅',
          color: 'purple'
        })
      }
    })

    // Payment activities
    payments.forEach(payment => {
      const employee = employees.find(e => e.id === payment.employeeId)
      const workDaysCount = workDays.filter(wd => payment.workDayIds.includes(wd.id)).length
      
      activities.push({
        id: `payment-${payment.id}`,
        type: 'payment_created',
        timestamp: payment.createdAt,
        employeeId: payment.employeeId,
        employeeName: employee?.name || 'Unknown Employee',
        description: `Payment of £${payment.amount.toFixed(2)} processed for ${workDaysCount} work day${workDaysCount !== 1 ? 's' : ''}`,
        details: { 
          amount: payment.amount, 
          paymentType: payment.paymentType, 
          workDaysCount,
          date: payment.date 
        },
        icon: '💳',
        color: 'green'
      })
    })

    // Sort by timestamp (newest first)
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    
    setActivityLog(activities)
  }

  const getTimeAgo = (timestamp: string) => {
    const now = new Date()
    const time = new Date(timestamp)
    const days = differenceInDays(now, time)
    const hours = differenceInHours(now, time)
    const minutes = differenceInMinutes(now, time)

    if (days > 0) return `${days} day${days !== 1 ? 's' : ''} ago`
    if (hours > 0) return `${hours} hour${hours !== 1 ? 's' : ''} ago`
    if (minutes > 0) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`
    return 'Just now'
  }

  const getFilteredActivities = () => {
    if (filter === 'all') return activityLog
    return activityLog.filter(activity => activity.type.includes(filter))
  }

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'blue': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'green': return 'bg-green-100 text-green-800 border-green-200'
      case 'purple': return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'orange': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'red': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="container mx-auto px-4 py-6 max-w-4xl">
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-gray-600">Loading activity log...</p>
                      </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation onNavigate={handleNavigate} />
    </div>
  )
  }

  const filteredActivities = getFilteredActivities()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 pb-20 sm:pb-24">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          {/* Back Button */}
          <div className="flex justify-start mb-6">
            <button
              onClick={() => window.location.href = '/'}
              className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Dashboard
            </button>
          </div>
          
          {/* Centered Header Content */}
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Activity Log</h1>
            <p className="text-gray-600 text-sm mb-6">Complete timeline of all changes and activities</p>
            
            <button
              onClick={loadData}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Filter Activities</h3>
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'all', label: 'All Activities', count: activityLog.length },
              { key: 'employee', label: 'Employee Changes', count: activityLog.filter(a => a.type.includes('employee')).length },
              { key: 'work', label: 'Work Days', count: activityLog.filter(a => a.type.includes('work')).length },
              { key: 'payment', label: 'Payments', count: activityLog.filter(a => a.type.includes('payment')).length },
              { key: 'wage', label: 'Wage Changes', count: activityLog.filter(a => a.type.includes('wage')).length }
            ].map(filterOption => (
              <button
                key={filterOption.key}
                onClick={() => setFilter(filterOption.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === filterOption.key
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {filterOption.label} ({filterOption.count})
              </button>
            ))}
          </div>
        </div>

        {/* Activity Timeline */}
        <div className="space-y-4">
          {filteredActivities.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No Activities Found</h3>
              <p className="text-gray-500">No activities match the selected filter.</p>
            </div>
          ) : (
            filteredActivities.map((activity, index) => (
              <div key={activity.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start space-x-4">
                  {/* Timeline dot */}
                  <div className="flex-shrink-0 relative">
                    <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center text-lg ${getColorClasses(activity.color)}`}>
                      {activity.icon}
                    </div>
                    {index < filteredActivities.length - 1 && (
                      <div className="absolute top-10 left-1/2 transform -translate-x-1/2 w-0.5 h-8 bg-gray-200"></div>
                    )}
                  </div>

                  {/* Activity content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{activity.description}</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Employee: <span className="font-medium">{activity.employeeName}</span>
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">
                          {format(parseISO(activity.timestamp), 'MMM d, yyyy')}
                        </p>
                        <p className="text-xs text-gray-500">
                          {format(parseISO(activity.timestamp), 'h:mm a')}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {getTimeAgo(activity.timestamp)}
                        </p>
                      </div>
                    </div>

                    {/* Activity details */}
                    {activity.details && (
                      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                          {activity.type === 'payment_created' && (
                            <>
                              <div><span className="font-medium">Amount:</span> £{activity.details.amount.toFixed(2)}</div>
                              <div><span className="font-medium">Method:</span> {activity.details.paymentType}</div>
                              <div><span className="font-medium">Work Days:</span> {activity.details.workDaysCount}</div>
                              <div><span className="font-medium">Payment Date:</span> {format(parseISO(activity.details.date), 'MMM d, yyyy')}</div>
                            </>
                          )}
                          {activity.type === 'wage_changed' && (
                            <>
                              <div><span className="font-medium">Previous Wage:</span> £{activity.details.oldWage}/day</div>
                              <div><span className="font-medium">New Wage:</span> £{activity.details.newWage}/day</div>
                            </>
                          )}
                          {activity.type === 'employee_created' && (
                            <div><span className="font-medium">Daily Wage:</span> £{activity.details.dailyWage}/day</div>
                          )}
                          {activity.type === 'work_day_added' && (
                            <>
                              <div><span className="font-medium">Date:</span> {format(parseISO(activity.details.date), 'MMM d, yyyy')}</div>
                              <div><span className="font-medium">Status:</span> {activity.details.paid ? 'Paid' : 'Unpaid'}</div>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Summary Stats */}
        <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Activity Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{employees.length}</div>
              <div className="text-sm text-gray-600">Total Employees</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{workDays.filter(wd => wd.worked).length}</div>
              <div className="text-sm text-gray-600">Work Days Recorded</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{payments.length}</div>
              <div className="text-sm text-gray-600">Payments Processed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                £{payments.reduce((sum, p) => sum + p.amount, 0).toFixed(0)}
              </div>
              <div className="text-sm text-gray-600">Total Paid Out</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 