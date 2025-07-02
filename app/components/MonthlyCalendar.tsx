'use client'

import { useState } from 'react'
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay,
  addMonths,
  subMonths,
  parseISO,
  isToday,
  startOfWeek,
  endOfWeek
} from 'date-fns'

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

interface Payment {
  id: string
  employeeId: string
  date: string
  amount: number
  paymentType: string
  workDayIds: string[]
  createdAt: string
}

interface MonthlyCalendarProps {
  employee: Employee
  workDays: WorkDay[]
  payments: Payment[]
  onDateClick?: (date: Date) => void
}

export default function MonthlyCalendar({ employee, workDays, payments, onDateClick }: MonthlyCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  
  // Get the full week range to properly align days in the calendar grid
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 }) // 0 = Sunday
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  // Helper function to get work day amount
  const getWorkDayAmount = (workDay: WorkDay) => {
    if (workDay.customAmount !== undefined) {
      return workDay.customAmount
    }
    if (employee.wageChangeDate && employee.previousWage && workDay.date < employee.wageChangeDate) {
      return employee.previousWage
    }
    return employee.dailyWage
  }

  // Get day info for a specific date
  const getDayInfo = (date: Date) => {
    try {
      const dateStr = format(date, 'yyyy-MM-dd')
      const today = format(new Date(), 'yyyy-MM-dd') // Use string comparison to avoid timezone issues
      
      // Only consider work days that are actually worked or scheduled (not removed/cancelled)
      // Show work days if: worked=true OR (worked=false AND date is today or future - i.e., still scheduled)
      const workDay = workDays.find(wd => {
        if (wd.date !== dateStr) return false
        if (wd.worked) return true // Always show if actually worked
        return dateStr >= today // Show unworked if it's today or future (still scheduled)
      })

      return {
        workDay,
        dateStr
      }
    } catch (error) {
      console.error('Error getting day info:', error)
      return {
        workDay: undefined,
        dateStr: ''
      }
    }
  }

  // Get status for a day
  const getDayStatus = (date: Date) => {
    const { workDay } = getDayInfo(date)
    const today = new Date()
    today.setHours(23, 59, 59, 999)
    const isFuture = date > today

    if (workDay) {
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

    return null
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
          <div className="w-3 h-3 bg-gray-200 rounded-full border border-gray-400"></div>
          <span className="text-gray-600">Click empty days to mark as worked</span>
        </div>
      </div>

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
           const dayStatus = getDayStatus(date)
           const { workDay } = getDayInfo(date)
           const isCurrentMonth = isSameMonth(date, currentDate)
           const isTodayDate = isToday(date)

           return (
             <div
               key={date.toISOString()}
               onClick={() => onDateClick?.(date)}
               className={`
                 relative p-2 min-h-[40px] text-center cursor-pointer transition-all
                 ${isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}
                 ${isTodayDate ? 'ring-2 ring-indigo-500 ring-opacity-50' : ''}
                 ${dayStatus ? dayStatus.bgColor : 'hover:bg-blue-50 hover:border-blue-200'}
                 rounded-lg border border-transparent
                 ${!dayStatus && isCurrentMonth ? 'hover:shadow-sm' : ''}
               `}
               title={!dayStatus && isCurrentMonth ? 'Click to mark as worked' : undefined}
             >
               <div className="text-sm font-medium">
                 {format(date, 'd')}
               </div>
               
               {dayStatus && (
                 <div className="flex items-center justify-center mt-1">
                   <div className={`w-2 h-2 rounded-full ${dayStatus.color} mr-1`}></div>
                   <span className="text-xs">{dayStatus.label}</span>
                 </div>
               )}
 
               {workDay && (
                 <div className="absolute -top-1 -right-1">
                   <div className="text-xs bg-white rounded-full px-1 shadow-sm border">
                     £{getWorkDayAmount(workDay).toFixed(0)}
                   </div>
                 </div>
               )}
             </div>
          )
        })}
      </div>


    </div>
  )
} 