import { useAppStore } from '../../lib/store'

interface AppHeaderProps {
  onNavigate?: (path: string) => void
}

export default function AppHeader({ onNavigate }: AppHeaderProps) {
  const { employees } = useAppStore()

  return (
    <>
      {/* Settings Icon - Top Right */}
      {onNavigate && (
        <div className="flex justify-end mb-4">
          <button
            onClick={() => onNavigate('/settings')}
            className="p-2 rounded-xl bg-white/80 border border-gray-200/50 hover:bg-white hover:shadow-sm transition-all duration-200 backdrop-blur-sm"
            aria-label="Settings"
          >
            <svg className="w-5 h-5 text-gray-600 hover:text-gray-800 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      )}
      
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
          Track work, manage payments, and stay organised
        </p>

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