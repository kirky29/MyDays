'use client'

import { useState } from 'react'
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  addMonths,
  subMonths,
  isToday
} from 'date-fns'
import { useAppStore } from '../../lib/store'

interface Employee {
  id: string
  name: string
  dailyWage: number
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

interface DayShift {
  workDay: WorkDay
  employee: Employee
  amount: number
  status: {
    type: string
    color: string
    bgColor: string
    textColor: string
    label: string
  }
}

export default function AllEmployeesCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const { employees, workDays, payments } = useAppStore()

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // Helper function to get work day amount
  const getWorkDayAmount = (workDay: WorkDay, employee: Employee) => {
    if (workDay.customAmount !== undefined) {
      return workDay.customAmount
    }
    if (employee.wageChangeDate && employee.previousWage && workDay.date < employee.wageChangeDate) {
      return employee.previousWage
    }
    return employee.dailyWage
  }

  // Get all shifts for a specific date
  const getDayShifts = (date: Date): DayShift[] => {
    const dateStr = format(date, 'yyyy-MM-dd')
    const today = format(new Date(), 'yyyy-MM-dd')
    
    const dayShifts: DayShift[] = []
    
    // Find all work days for this date
    const dayWorkDays = workDays.filter(wd => {
      if (wd.date !== dateStr) return false
      if (wd.worked) return true // Always show if actually worked
      return dateStr >= today // Show unworked if it's today or future (still scheduled)
    })
    
    dayWorkDays.forEach(workDay => {
      const employee = employees.find(emp => emp.id === workDay.employeeId)
      if (!employee) return
      
      const amount = getWorkDayAmount(workDay, employee)
      const status = getDayStatus(date, workDay)
      
      dayShifts.push({
        workDay,
        employee,
        amount,
        status
      })
    })
    
    // Sort by employee name for consistent display
    return dayShifts.sort((a, b) => a.employee.name.localeCompare(b.employee.name))
  }

  // Get status for a day/work day
  const getDayStatus = (date: Date, workDay: WorkDay) => {
    const today = new Date()
    today.setHours(23, 59, 59, 999)
    const isFuture = date > today

    if (isFuture) {
      return {
        type: 'scheduled',
        color: 'bg-blue-500',
        bgColor: 'bg-blue-100',
        textColor: 'text-blue-700',
        label: '📅'
      }
    } else if (workDay.worked && workDay.paid) {
      return {
        type: 'worked-paid',
        color: 'bg-green-500',
        bgColor: 'bg-green-100',
        textColor: 'text-green-700',
        label: '✅'
      }
    } else if (workDay.worked && !workDay.paid) {
      return {
        type: 'worked-unpaid',
        color: 'bg-amber-500',
        bgColor: 'bg-amber-100',
        textColor: 'text-amber-700',
        label: '⏳'
      }
    } else {
      return {
        type: 'not-worked',
        color: 'bg-gray-500',
        bgColor: 'bg-gray-100',
        textColor: 'text-gray-600',
        label: '❌'
      }
    }
  }

  const goToPreviousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1))
  }

  const goToNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1))
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  // Generate a consistent color for each employee
  const getEmployeeColor = (employeeId: string) => {
    const colors = [
      'bg-blue-500 text-blue-50',
      'bg-green-500 text-green-50', 
      'bg-purple-500 text-purple-50',
      'bg-pink-500 text-pink-50',
      'bg-indigo-500 text-indigo-50',
      'bg-cyan-500 text-cyan-50',
      'bg-orange-500 text-orange-50',
      'bg-teal-500 text-teal-50'
    ]
    
    // Simple hash to get consistent color
    let hash = 0
    for (let i = 0; i < employeeId.length; i++) {
      hash = ((hash << 5) - hash + employeeId.charCodeAt(i)) & 0xffffffff
    }
    return colors[Math.abs(hash) % colors.length]
  }

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-gray-900 flex items-center">
          <svg className="w-5 h-5 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {format(currentDate, 'MMMM yyyy')}
        </h3>
        <div className="flex items-center space-x-2">
          <button
            onClick={goToPreviousMonth}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={goToToday}
            className="px-3 py-1 text-sm text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors"
          >
            Today
          </button>
          <button
            onClick={goToNextMonth}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="mb-4 flex flex-wrap gap-2 text-xs">
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
          <span className="text-gray-600">Scheduled</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
          <span className="text-gray-600">Worked (Unpaid)</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <span className="text-gray-600">Worked & Paid</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
          <span className="text-gray-600">Not Worked</span>
        </div>
      </div>

      {/* Employee Legend */}
      {employees.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Employees:</h4>
          <div className="flex flex-wrap gap-2 text-xs">
            {employees.map(employee => (
              <div key={employee.id} className="flex items-center space-x-1">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${getEmployeeColor(employee.id)}`}>
                  {employee.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-gray-600">{employee.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Day headers */}
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="p-2 text-center text-xs font-medium text-gray-500">
            {day}
          </div>
        ))}

        {/* Calendar days */}
        {calendarDays.map(date => {
          const dayShifts = getDayShifts(date)
          const isCurrentMonth = isSameMonth(date, currentDate)
          const isTodayDate = isToday(date)

          return (
            <div
              key={date.toISOString()}
              className={`
                relative p-1 min-h-[100px] border border-gray-200 bg-white
                ${isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}
                ${isTodayDate ? 'ring-2 ring-blue-500 ring-opacity-50' : ''}
                ${dayShifts.length === 0 ? 'hover:bg-blue-50' : ''}
              `}
            >
              <div className="text-sm font-medium text-left mb-1 px-1">
                {format(date, 'd')}
              </div>
              
              {/* Shifts for this day */}
              <div className="space-y-0.5 px-1">
                {dayShifts.slice(0, 3).map((shift, index) => (
                  <div
                    key={shift.workDay.id}
                    className="text-xs cursor-pointer hover:opacity-80"
                    title={`${shift.employee.name} - £${shift.amount.toFixed(0)} - ${shift.status.type}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900 truncate">
                        {shift.employee.name}
                      </span>
                      <div className="flex items-center space-x-1">
                        <span className="text-xs font-semibold text-blue-600">
                          £{shift.amount.toFixed(0)}
                        </span>
                        <span className="text-xs">{shift.status.label}</span>
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Show count if more than 3 shifts */}
                {dayShifts.length > 3 && (
                  <div className="text-xs text-gray-500 text-center py-0.5">
                    +{dayShifts.length - 3} more
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Summary for current month */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-blue-600">
              {calendarDays.reduce((count, date) => {
                const shifts = getDayShifts(date).filter(s => s.status.type === 'scheduled')
                return count + shifts.length
              }, 0)}
            </div>
            <div className="text-xs text-gray-600">Scheduled Shifts</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-amber-600">
              {calendarDays.reduce((count, date) => {
                const shifts = getDayShifts(date).filter(s => s.status.type === 'worked-unpaid')
                return count + shifts.length
              }, 0)}
            </div>
            <div className="text-xs text-gray-600">Unpaid Shifts</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">
              {calendarDays.reduce((count, date) => {
                const shifts = getDayShifts(date).filter(s => s.status.type === 'worked-paid')
                return count + shifts.length
              }, 0)}
            </div>
            <div className="text-xs text-gray-600">Paid Shifts</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-indigo-600">
              £{calendarDays.reduce((total, date) => {
                const shifts = getDayShifts(date)
                return total + shifts.reduce((sum, shift) => sum + shift.amount, 0)
              }, 0).toFixed(0)}
            </div>
            <div className="text-xs text-gray-600">Total Month Value</div>
          </div>
        </div>
      </div>
    </div>
  )
} 