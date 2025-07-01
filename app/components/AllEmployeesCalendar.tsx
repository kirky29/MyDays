'use client'

import { useState, useEffect } from 'react'
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

interface DayNote {
  id: string
  date: string
  content: string
  createdAt: string
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
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [dayNotes, setDayNotes] = useState<DayNote[]>([])
  const { employees, workDays, payments } = useAppStore()

  // Load notes from localStorage (temporary solution)
  useEffect(() => {
    const savedNotes = localStorage.getItem('dayNotes')
    if (savedNotes) {
      try {
        setDayNotes(JSON.parse(savedNotes))
      } catch (error) {
        console.error('Error loading notes from localStorage:', error)
      }
    }
  }, [])

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

  // Get notes for a specific date
  const getDayNotes = (date: Date): DayNote[] => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return dayNotes.filter(note => note.date === dateStr)
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
      <div className="grid grid-cols-7 gap-px">
        {/* Day headers */}
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="p-2 text-center text-xs font-medium text-gray-500">
            {day}
          </div>
        ))}

        {/* Calendar days */}
        {calendarDays.map(date => {
          const dayShifts = getDayShifts(date)
          const dayNotesForDate = getDayNotes(date)
          const isCurrentMonth = isSameMonth(date, currentDate)
          const isTodayDate = isToday(date)
          const totalItems = dayShifts.length + dayNotesForDate.length

          return (
            <div
              key={date.toISOString()}
              onClick={() => setSelectedDate(date)}
              className={`
                relative p-1 min-h-[100px] border border-gray-200 bg-white cursor-pointer
                ${isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}
                ${isTodayDate ? 'ring-2 ring-blue-500 ring-opacity-50' : ''}
                ${totalItems === 0 ? 'hover:bg-blue-50' : 'hover:bg-gray-50'}
              `}
            >
              <div className="text-sm font-medium text-left mb-1">
                {format(date, 'd')}
              </div>
              
              {/* Shifts and Notes for this day */}
              <div className="space-y-0.5">
                {/* Show shifts first */}
                {dayShifts.slice(0, 2).map((shift, index) => (
                  <div
                    key={shift.workDay.id}
                    className="text-xs cursor-pointer hover:opacity-80"
                    title={`${shift.employee.name} - £${shift.amount.toFixed(0)} - ${shift.status.type}`}
                  >
                    <div className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${shift.status.bgColor} ${shift.status.textColor}`}>
                      {shift.employee.name}
                    </div>
                  </div>
                ))}
                
                {/* Show notes */}
                {dayNotesForDate.slice(0, 3 - Math.min(dayShifts.length, 2)).map((note, index) => (
                  <div
                    key={note.id}
                    className="text-xs cursor-pointer hover:opacity-80"
                    title={note.content}
                  >
                    <div className="inline-block px-1.5 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">
                      Note
                    </div>
                  </div>
                ))}
                
                {/* Show count if more items than can be displayed */}
                {totalItems > 3 && (
                  <div className="text-xs text-gray-500 text-center py-0.5">
                    +{totalItems - 3} more
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

      {/* Day Detail Modal */}
      {selectedDate && (
        <DayDetailModal
          isOpen={!!selectedDate}
          onClose={() => setSelectedDate(null)}
          date={selectedDate}
          employees={employees}
          workDays={workDays}
          payments={payments}
          dayNotes={dayNotes}
          onNotesUpdate={setDayNotes}
        />
      )}
    </div>
  )
}

// Day Detail Modal Component
interface DayDetailModalProps {
  isOpen: boolean
  onClose: () => void
  date: Date
  employees: Employee[]
  workDays: WorkDay[]
  payments: any[]
  dayNotes: DayNote[]
  onNotesUpdate: (notes: DayNote[]) => void
}

function DayDetailModal({ isOpen, onClose, date, employees, workDays, payments, dayNotes, onNotesUpdate }: DayDetailModalProps) {
  const [isAddingShift, setIsAddingShift] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<string>('')
  const [shiftType, setShiftType] = useState<'worked' | 'scheduled'>('worked')
  const [isAddingNote, setIsAddingNote] = useState(false)
  const [noteContent, setNoteContent] = useState('')

  if (!isOpen) return null

  const dateStr = format(date, 'yyyy-MM-dd')
  const dayWorkDays = workDays.filter(wd => wd.date === dateStr)
  const dayPayments = payments.filter(p => p.date === dateStr)
  const modalDayNotes = dayNotes.filter(note => note.date === dateStr)
  
  const today = new Date()
  today.setHours(23, 59, 59, 999)
  const isFutureDate = date > today
  const isPastOrTodayDate = date <= today
  
  // Set default shift type based on date when modal opens
  useEffect(() => {
    if (isFutureDate) {
      setShiftType('scheduled')
    } else {
      setShiftType('worked')
    }
  }, [isFutureDate])

  // Navigation function
  const handleEmployeeClick = (employeeId: string) => {
    window.location.href = `/employee/${employeeId}`
  }

  // Note management functions (using localStorage temporarily)
  const handleAddNote = () => {
    if (!noteContent.trim()) return

    const newNote: DayNote = {
      id: `note-${dateStr}-${Date.now()}`,
      date: dateStr,
      content: noteContent.trim(),
      createdAt: new Date().toISOString()
    }
    
    const updatedNotes = [...dayNotes, newNote]
    onNotesUpdate(updatedNotes)
    localStorage.setItem('dayNotes', JSON.stringify(updatedNotes))
    setNoteContent('')
    setIsAddingNote(false)
  }

  const handleDeleteNote = (noteId: string) => {
    const updatedNotes = dayNotes.filter(note => note.id !== noteId)
    onNotesUpdate(updatedNotes)
    localStorage.setItem('dayNotes', JSON.stringify(updatedNotes))
  }

  const getEmployeeStatus = (employeeId: string) => {
    const workDay = dayWorkDays.find(wd => wd.employeeId === employeeId)

    if (!workDay) return { status: 'not-scheduled', label: 'Not Scheduled', bgColor: 'bg-gray-100', textColor: 'text-gray-600' }
    
    if (isFutureDate) {
      return { status: 'scheduled', label: 'Scheduled', bgColor: 'bg-blue-100', textColor: 'text-blue-700' }
    } else if (workDay.worked && workDay.paid) {
      return { status: 'worked-paid', label: 'Worked & Paid', bgColor: 'bg-green-100', textColor: 'text-green-700' }
    } else if (workDay.worked && !workDay.paid) {
      return { status: 'worked-unpaid', label: 'Worked (Unpaid)', bgColor: 'bg-amber-100', textColor: 'text-amber-700' }
    } else {
      return { status: 'not-worked', label: 'Not Worked', bgColor: 'bg-gray-100', textColor: 'text-gray-600' }
    }
  }

  const handleAddShift = async () => {
    if (!selectedEmployee) return

    try {
      const { firebaseService } = await import('../../lib/firebase')
      
      // Determine worked status based on date and context
      const isWorked = isPastOrTodayDate ? (shiftType === 'worked') : false
      
      const newWorkDay: WorkDay = {
        id: `${selectedEmployee}-${dateStr}`,
        employeeId: selectedEmployee,
        date: dateStr,
        worked: isWorked,
        paid: false
      }
      
      await firebaseService.addWorkDay(newWorkDay)
      setIsAddingShift(false)
      setSelectedEmployee('')
    } catch (error) {
      console.error('Error adding shift:', error)
      alert('Failed to add shift')
    }
  }

  const unscheduledEmployees = employees.filter(emp => 
    !dayWorkDays.some(wd => wd.employeeId === emp.id)
  )
  
  // Only show employees who are actually working (have work days)
  const workingEmployees = employees.filter(emp =>
    dayWorkDays.some(wd => wd.employeeId === emp.id)
  )

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {format(date, 'EEEE, MMMM d, yyyy')}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Day Overview & Management
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Working Employees Status */}
          {workingEmployees.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {workingEmployees.length === 1 ? 'Employee Working' : 'Employees Working'}
              </h3>
              <div className="space-y-3">
                {workingEmployees.map(employee => {
                  const status = getEmployeeStatus(employee.id)
                  const workDay = dayWorkDays.find(wd => wd.employeeId === employee.id)
                  
                  return (
                    <div 
                      key={employee.id} 
                      onClick={() => handleEmployeeClick(employee.id)}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                          <span className="text-white font-bold text-sm">
                            {employee.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 hover:text-indigo-600 transition-colors">
                            {employee.name}
                          </div>
                          <div className={`inline-block px-2 py-1 rounded text-xs font-medium ${status.bgColor} ${status.textColor}`}>
                            {status.label}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        {workDay && (
                          <div className="text-sm text-gray-600">
                            £{workDay.customAmount !== undefined ? workDay.customAmount : employee.dailyWage}
                          </div>
                        )}
                        <div className="text-xs text-gray-400 mt-1">
                          Click to view profile →
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* No employees working message */}
          {workingEmployees.length === 0 && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No employees scheduled</h3>
              <p className="text-gray-600">
                {isFutureDate ? 'No one is scheduled to work on this day yet.' : 'No one worked on this day.'}
              </p>
            </div>
          )}

          {/* Day Notes */}
          {modalDayNotes.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Notes</h3>
              <div className="space-y-2">
                {modalDayNotes.map(note => (
                  <div key={note.id} className="flex items-start justify-between p-3 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="flex-1">
                      <p className="text-sm text-gray-900">{note.content}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Added {format(new Date(note.createdAt), 'MMM d, h:mm a')}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteNote(note.id)}
                      className="ml-2 p-1 text-gray-400 hover:text-red-600 transition-colors"
                      title="Delete note"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add Note */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Note</h3>
            
            {!isAddingNote ? (
              <button
                onClick={() => setIsAddingNote(true)}
                className="w-full p-3 border-2 border-dashed border-purple-300 rounded-lg text-purple-600 hover:border-purple-500 hover:text-purple-700 transition-colors"
              >
                + Add Note for This Day
              </button>
            ) : (
              <div className="space-y-4 p-4 bg-purple-50 rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Note Content
                  </label>
                  <textarea
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    placeholder="Add a note for this day..."
                    rows={3}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                  />
                </div>
                
                <div className="flex space-x-3">
                  <button
                    onClick={handleAddNote}
                    disabled={!noteContent.trim()}
                    className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add Note
                  </button>
                  <button
                    onClick={() => {
                      setIsAddingNote(false)
                      setNoteContent('')
                    }}
                    className="flex-1 bg-gray-500 text-white py-2 px-4 rounded-lg hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Add New Shift */}
          {unscheduledEmployees.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Employee Shift</h3>
              
              {!isAddingShift ? (
                <button
                  onClick={() => setIsAddingShift(true)}
                  className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-indigo-500 hover:text-indigo-600 transition-colors"
                >
                  + Add Employee to This Day
                </button>
              ) : (
                <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Employee
                    </label>
                    <select
                      value={selectedEmployee}
                      onChange={(e) => setSelectedEmployee(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Choose an employee...</option>
                      {unscheduledEmployees.map(employee => (
                        <option key={employee.id} value={employee.id}>
                          {employee.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Shift Type
                    </label>
                    <div className="flex space-x-4">
                      {isPastOrTodayDate && (
                        <label className="flex items-center">
                          <input
                            type="radio"
                            value="worked"
                            checked={shiftType === 'worked'}
                            onChange={(e) => setShiftType(e.target.value as 'worked' | 'scheduled')}
                            className="mr-2"
                          />
                          Mark as Worked
                        </label>
                      )}
                      {isFutureDate && (
                        <label className="flex items-center">
                          <input
                            type="radio"
                            value="scheduled"
                            checked={shiftType === 'scheduled'}
                            onChange={(e) => setShiftType(e.target.value as 'worked' | 'scheduled')}
                            className="mr-2"
                          />
                          Schedule for Future
                        </label>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex space-x-3">
                    <button
                      onClick={handleAddShift}
                      disabled={!selectedEmployee}
                      className="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Add Shift
                    </button>
                    <button
                      onClick={() => {
                        setIsAddingShift(false)
                        setSelectedEmployee('')
                      }}
                      className="flex-1 bg-gray-500 text-white py-2 px-4 rounded-lg hover:bg-gray-600"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Day Summary */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Day Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {dayWorkDays.filter(wd => {
                    return isFutureDate
                  }).length}
                </div>
                <div className="text-xs text-blue-600">Scheduled</div>
              </div>
              <div className="text-center p-3 bg-amber-50 rounded-lg">
                <div className="text-2xl font-bold text-amber-600">
                  {dayWorkDays.filter(wd => wd.worked && !wd.paid).length}
                </div>
                <div className="text-xs text-amber-600">Unpaid</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {dayWorkDays.filter(wd => wd.worked && wd.paid).length}
                </div>
                <div className="text-xs text-green-600">Paid</div>
              </div>
              <div className="text-center p-3 bg-indigo-50 rounded-lg">
                <div className="text-2xl font-bold text-indigo-600">
                  £{dayWorkDays.reduce((total, wd) => {
                    const employee = employees.find(emp => emp.id === wd.employeeId)
                    if (!employee) return total
                    const amount = wd.customAmount !== undefined ? wd.customAmount : employee.dailyWage
                    return total + amount
                  }, 0).toFixed(0)}
                </div>
                <div className="text-xs text-indigo-600">Total Value</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 