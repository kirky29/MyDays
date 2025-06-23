import { useAppStore } from '../../lib/store'

export default function AppHeader() {
  const { employees, workDays } = useAppStore()

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
          <span className="text-gradient">Did They Work?</span>
        </h1>
        
        {/* Subtitle with better typography */}
        <p className="text-gray-600 mb-6 sm:mb-8 text-sm sm:text-base max-w-xs mx-auto leading-relaxed">
          Track work, manage payments, and stay organized
        </p>

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
            <h3 className="text-sm font-semibold text-blue-900 mb-1">Welcome to Did They Work?</h3>
            <p className="text-xs text-blue-700">
              Start by adding your first employee to begin tracking work and payments.
            </p>
          </div>
        )}
      </div>
    </>
  )
} 