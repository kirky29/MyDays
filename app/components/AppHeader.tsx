import { useState } from 'react'
import { useAppStore } from '../../lib/store'
import ReportModal from './ReportModal'

export default function AppHeader() {
  const { employees, workDays, payments } = useAppStore()
  const [showReportModal, setShowReportModal] = useState(false)

  return (
    <>
      <div className="text-center mb-6 sm:mb-8">
        {/* App Icon with enhanced design */}
        <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 rounded-2xl sm:rounded-3xl shadow-lg mb-4 sm:mb-6 relative overflow-hidden">
          {/* Background pattern */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>
          <div className="absolute top-1 right-1 w-3 h-3 bg-white/30 rounded-full"></div>
          
          {/* Icon */}
          <svg className="w-8 h-8 sm:w-10 sm:h-10 text-white relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
          </svg>
        </div>
        
        {/* Title with gradient text */}
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">
          <span className="text-gradient">My Days</span>
        </h1>
        
        {/* Subtitle with better typography */}
        <p className="text-gray-600 mb-6 sm:mb-8 text-sm sm:text-base max-w-xs mx-auto leading-relaxed">
          Track work, manage payments, and stay organized
        </p>
        
        {/* Enhanced Action Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-center space-y-3 sm:space-y-0 sm:space-x-4">
          {/* Reports Button */}
          <button
            onClick={() => setShowReportModal(true)}
            className="btn btn-secondary btn-md group"
          >
            <svg className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            View Reports
          </button>
          
          {/* Employee Count Badge */}
          {employees.length > 0 && (
            <div className="flex items-center bg-green-50 border border-green-200 rounded-full px-3 py-1.5 text-sm">
              <div className="status-indicator status-success mr-2"></div>
              <span className="font-medium text-green-800">
                {employees.length} employee{employees.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>

        {/* Quick Stats Preview */}
        {employees.length > 0 && (
          <div className="mt-6 grid grid-cols-3 gap-3 max-w-sm mx-auto">
            <div className="text-center">
              <div className="text-lg sm:text-xl font-bold text-blue-600">
                {workDays.filter(day => day.worked).length}
              </div>
              <div className="text-xs text-gray-600 font-medium">Work Days</div>
            </div>
            <div className="text-center">
              <div className="text-lg sm:text-xl font-bold text-green-600">
                {workDays.filter(day => day.paid).length}
              </div>
              <div className="text-xs text-gray-600 font-medium">Paid Days</div>
            </div>
            <div className="text-center">
              <div className="text-lg sm:text-xl font-bold text-gray-900">
                {employees.length}
              </div>
              <div className="text-xs text-gray-600 font-medium">Team Size</div>
            </div>
          </div>
        )}

        {/* Welcome Message for New Users */}
        {employees.length === 0 && (
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-2xl p-4 max-w-sm mx-auto">
            <div className="text-2xl mb-2">👋</div>
            <h3 className="text-sm font-semibold text-blue-900 mb-1">Welcome to My Days!</h3>
            <p className="text-xs text-blue-700">
              Start by adding your first employee to begin tracking work and payments.
            </p>
          </div>
        )}
      </div>

      {/* Report Modal */}
      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        employees={employees}
        workDays={workDays}
        payments={payments}
      />
    </>
  )
} 