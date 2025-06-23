'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { useFirebaseData } from '../../lib/hooks/useFirebaseData'
import { useAppStore } from '../../lib/store'
import type { Employee, WorkDay } from '../../lib/store'
import BottomNavigation from '../components/BottomNavigation'
import LoadingScreen from '../components/LoadingScreen'
import SyncStatus from '../components/SyncStatus'

export default function Team() {
  const router = useRouter()
  
  // Use the centralized store and data management
  const { 
    employees, 
    workDays, 
    loading 
  } = useAppStore()

  // Initialize Firebase data loading
  useFirebaseData()

  const handleNavigate = (path: string) => {
    router.push(path)
  }

  const navigateToEmployee = (employeeId: string) => {
    router.push(`/employee/${employeeId}`)
  }

  const calculateEmployeeStats = (employeeId: string) => {
    const employee = employees.find(emp => emp.id === employeeId)
    if (!employee) return { totalWorked: 0, totalPaid: 0, totalOwed: 0, totalEarned: 0 }
    
    const workedDays = workDays.filter(day => 
      day.employeeId === employeeId && day.worked
    ).length
    
    const paidDays = workDays.filter(day => 
      day.employeeId === employeeId && day.paid
    ).length
    
    const totalEarned = workedDays * employee.dailyWage
    const totalPaid = paidDays * employee.dailyWage
    const totalOwed = totalEarned - totalPaid
    
    return { totalWorked: workedDays, totalPaid: paidDays, totalOwed, totalEarned }
  }

  if (loading) {
    return <LoadingScreen />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50 pb-20 sm:pb-24">
      <div className="container mx-auto px-4 py-4 sm:py-6 max-w-md">
        {/* Status and Header Section */}
        <div className="space-y-mobile">
          <SyncStatus />
          
          {/* Enhanced Header */}
          <div className="text-center mb-6 sm:mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-purple-500 via-purple-600 to-indigo-600 rounded-2xl sm:rounded-3xl shadow-lg mb-4 sm:mb-6 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>
              <div className="absolute top-1 right-1 w-3 h-3 bg-white/30 rounded-full"></div>
              <svg className="w-8 h-8 sm:w-10 sm:h-10 text-white relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">
              <span className="text-gradient">Your Team</span>
            </h1>
            <p className="text-gray-600 text-sm sm:text-base max-w-xs mx-auto leading-relaxed">
              {employees.length === 0 
                ? 'Build your team to get started' 
                : `Managing ${employees.length} team member${employees.length !== 1 ? 's' : ''}`
              }
            </p>
          </div>
        </div>

        {/* Add Team Member Button - Always visible */}
        <div className="mb-6">
          <button
            onClick={() => handleNavigate('/add-employee')}
            className="btn btn-primary btn-lg w-full group"
          >
            <div className="flex items-center justify-center space-x-3">
              <div className="w-6 h-6 bg-white/20 rounded-lg flex items-center justify-center group-hover:bg-white/30 transition-colors">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              </div>
              <span className="font-semibold">Add Team Member</span>
            </div>
          </button>
        </div>

        {/* Employee List */}
        {employees.length > 0 && (
          <div className="space-y-4 mb-6">
            {employees.map(employee => {
              const stats = calculateEmployeeStats(employee.id)
              return (
                <div key={employee.id} className="card hover:shadow-lg transition-all duration-200 group">
                  <div className="card-body">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="avatar avatar-lg bg-gradient-to-br from-purple-500 to-indigo-600">
                          <span>{employee.name.charAt(0).toUpperCase()}</span>
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900 text-lg group-hover:text-purple-600 transition-colors">
                            {employee.name}
                          </h3>
                          <p className="text-sm text-gray-600 font-semibold">£{employee.dailyWage}/day</p>
                          {employee.startDate && (
                            <p className="text-xs text-gray-500">
                              Started {format(new Date(employee.startDate), 'MMM d, yyyy')}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <button
                        onClick={() => navigateToEmployee(employee.id)}
                        className="btn btn-secondary btn-sm group-hover:btn-primary transition-all duration-200"
                      >
                        View Profile
                      </button>
                    </div>

                    {/* Enhanced Stats Grid */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-3 text-center border border-blue-200/50">
                        <div className="text-xl sm:text-2xl font-bold text-blue-600">{stats.totalWorked}</div>
                        <div className="text-xs text-blue-800 font-semibold">Days Worked</div>
                      </div>
                      <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-3 text-center border border-green-200/50">
                        <div className="text-xl sm:text-2xl font-bold text-green-600">{stats.totalPaid}</div>
                        <div className="text-xs text-green-800 font-semibold">Days Paid</div>
                      </div>
                      <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-3 text-center border border-gray-200/50">
                        <div className={`text-xl sm:text-2xl font-bold ${stats.totalOwed > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          £{stats.totalOwed.toFixed(0)}
                        </div>
                        <div className="text-xs text-gray-600 font-semibold">Outstanding</div>
                        {stats.totalOwed > 0 && (
                          <div className="w-2 h-2 bg-red-500 rounded-full mx-auto mt-1 animate-pulse"></div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Contact Information */}
                  {(employee.email || employee.phone) && (
                    <div className="card-footer">
                      <div className="flex items-center justify-center space-x-6 text-sm">
                        {employee.email && (
                          <div className="flex items-center space-x-2 text-gray-600 group-hover:text-purple-600 transition-colors">
                            <div className="w-4 h-4 rounded bg-gray-200 flex items-center justify-center">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                              </svg>
                            </div>
                            <span className="font-medium">{employee.email}</span>
                          </div>
                        )}
                        {employee.phone && (
                          <div className="flex items-center space-x-2 text-gray-600 group-hover:text-purple-600 transition-colors">
                            <div className="w-4 h-4 rounded bg-gray-200 flex items-center justify-center">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                              </svg>
                            </div>
                            <span className="font-medium">{employee.phone}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Enhanced Empty State */}
        {employees.length === 0 && (
          <div className="card">
            <div className="card-body text-center py-12">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                <svg className="w-10 h-10 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Ready to build your team?</h3>
              <p className="text-gray-600 mb-6 max-w-sm mx-auto leading-relaxed">
                Add your first team member to start tracking work days, managing payments, and growing your business.
              </p>
              
              {/* Features Preview */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 text-sm">
                <div className="flex items-center space-x-2 text-gray-600">
                  <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <span className="font-medium">Track work days</span>
                </div>
                <div className="flex items-center space-x-2 text-gray-600">
                  <div className="w-6 h-6 bg-green-100 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                  <span className="font-medium">Manage payments</span>
                </div>
                <div className="flex items-center space-x-2 text-gray-600">
                  <div className="w-6 h-6 bg-purple-100 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <span className="font-medium">View reports</span>
                </div>
              </div>

              <div className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3 max-w-sm mx-auto">
                💡 <strong>Tip:</strong> You can add employee details like contact info, start date, and notes to keep everything organized.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation onNavigate={handleNavigate} />
    </div>
  )
} 