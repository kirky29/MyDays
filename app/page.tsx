'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'

interface Employee {
  id: string
  name: string
  dailyWage: number
}

interface WorkDay {
  id: string
  employeeId: string
  date: string
  worked: boolean
  paid: boolean
}

export default function Home() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [workDays, setWorkDays] = useState<WorkDay[]>([])
  const [newEmployeeName, setNewEmployeeName] = useState('')
  const [newEmployeeWage, setNewEmployeeWage] = useState('')
  const [selectedEmployee, setSelectedEmployee] = useState<string>('')
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))

  // Load data from localStorage on component mount
  useEffect(() => {
    const savedEmployees = localStorage.getItem('employees')
    const savedWorkDays = localStorage.getItem('workDays')
    
    if (savedEmployees) {
      setEmployees(JSON.parse(savedEmployees))
    }
    if (savedWorkDays) {
      setWorkDays(JSON.parse(savedWorkDays))
    }
  }, [])

  // Save data to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('employees', JSON.stringify(employees))
  }, [employees])

  useEffect(() => {
    localStorage.setItem('workDays', JSON.stringify(workDays))
  }, [workDays])

  const addEmployee = () => {
    if (!newEmployeeName.trim() || !newEmployeeWage) return
    
    const employee: Employee = {
      id: Date.now().toString(),
      name: newEmployeeName.trim(),
      dailyWage: parseFloat(newEmployeeWage)
    }
    
    setEmployees([...employees, employee])
    setNewEmployeeName('')
    setNewEmployeeWage('')
  }

  const deleteEmployee = (id: string) => {
    setEmployees(employees.filter(emp => emp.id !== id))
    setWorkDays(workDays.filter(day => day.employeeId !== id))
  }

  const toggleWorkDay = (employeeId: string, date: string) => {
    const existingDay = workDays.find(day => day.employeeId === employeeId && day.date === date)
    
    if (existingDay) {
      setWorkDays(workDays.map(day => 
        day.id === existingDay.id 
          ? { ...day, worked: !day.worked }
          : day
      ))
    } else {
      const newWorkDay: WorkDay = {
        id: Date.now().toString(),
        employeeId,
        date,
        worked: true,
        paid: false
      }
      setWorkDays([...workDays, newWorkDay])
    }
  }

  const togglePayment = (employeeId: string, date: string) => {
    const existingDay = workDays.find(day => day.employeeId === employeeId && day.date === date)
    
    if (existingDay) {
      setWorkDays(workDays.map(day => 
        day.id === existingDay.id 
          ? { ...day, paid: !day.paid }
          : day
      ))
    }
  }

  const getWorkDay = (employeeId: string, date: string) => {
    return workDays.find(day => day.employeeId === employeeId && day.date === date)
  }

  const calculateTotalEarnings = (employeeId: string) => {
    const employee = employees.find(emp => emp.id === employeeId)
    if (!employee) return 0
    
    const workedDays = workDays.filter(day => 
      day.employeeId === employeeId && day.worked
    ).length
    
    return workedDays * employee.dailyWage
  }

  const calculateTotalPaid = (employeeId: string) => {
    const employee = employees.find(emp => emp.id === employeeId)
    if (!employee) return 0
    
    const paidDays = workDays.filter(day => 
      day.employeeId === employeeId && day.paid
    ).length
    
    return paidDays * employee.dailyWage
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-md">
      <h1 className="text-2xl font-bold text-center mb-6 text-gray-800">
        My Days - Work Tracker
      </h1>

      {/* Add Employee Section */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <h2 className="text-lg font-semibold mb-4 text-gray-700">Add Employee</h2>
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Employee Name"
            value={newEmployeeName}
            onChange={(e) => setNewEmployeeName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <input
            type="number"
            placeholder="Daily Wage ($)"
            value={newEmployeeWage}
            onChange={(e) => setNewEmployeeWage(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            onClick={addEmployee}
            className="w-full bg-primary text-white py-2 px-4 rounded-md hover:bg-blue-600 transition-colors"
          >
            Add Employee
          </button>
        </div>
      </div>

      {/* Employee List */}
      {employees.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-700">Employees</h2>
          <div className="space-y-3">
            {employees.map(employee => (
              <div key={employee.id} className="border border-gray-200 rounded-md p-3">
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <h3 className="font-medium text-gray-800">{employee.name}</h3>
                    <p className="text-sm text-gray-600">${employee.dailyWage}/day</p>
                  </div>
                  <button
                    onClick={() => deleteEmployee(employee.id)}
                    className="text-danger hover:text-red-700 text-sm"
                  >
                    Delete
                  </button>
                </div>
                <div className="text-sm text-gray-600">
                  <p>Total Earned: ${calculateTotalEarnings(employee.id).toFixed(2)}</p>
                  <p>Total Paid: ${calculateTotalPaid(employee.id).toFixed(2)}</p>
                  <p className="font-medium">
                    Outstanding: ${(calculateTotalEarnings(employee.id) - calculateTotalPaid(employee.id)).toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Work Day Tracker */}
      {employees.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-700">Work Day Tracker</h2>
          
          {/* Date Selector */}
          <div className="mb-4">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Employee Work Status */}
          <div className="space-y-3">
            {employees.map(employee => {
              const workDay = getWorkDay(employee.id, selectedDate)
              return (
                <div key={employee.id} className="border border-gray-200 rounded-md p-3">
                  <h3 className="font-medium text-gray-800 mb-2">{employee.name}</h3>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => toggleWorkDay(employee.id, selectedDate)}
                      className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                        workDay?.worked
                          ? 'bg-secondary text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {workDay?.worked ? '✓ Worked' : 'Mark Worked'}
                    </button>
                    <button
                      onClick={() => togglePayment(employee.id, selectedDate)}
                      disabled={!workDay?.worked}
                      className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                        workDay?.paid
                          ? 'bg-warning text-white'
                          : workDay?.worked
                          ? 'bg-primary text-white hover:bg-blue-600'
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      {workDay?.paid ? '✓ Paid' : 'Mark Paid'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Summary */}
      {employees.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-4">
          <h2 className="text-lg font-semibold mb-4 text-gray-700">Summary</h2>
          <div className="space-y-2 text-sm">
            <p className="text-gray-600">Total Employees: {employees.length}</p>
            <p className="text-gray-600">
              Total Work Days: {workDays.filter(day => day.worked).length}
            </p>
            <p className="text-gray-600">
              Total Paid Days: {workDays.filter(day => day.paid).length}
            </p>
            <p className="font-medium text-gray-800">
              Total Outstanding: ${employees.reduce((total, emp) => 
                total + (calculateTotalEarnings(emp.id) - calculateTotalPaid(emp.id)), 0
              ).toFixed(2)}
            </p>
          </div>
        </div>
      )}
    </div>
  )
} 