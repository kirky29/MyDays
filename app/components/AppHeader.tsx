import { useAppStore } from '../../lib/store'

interface AppHeaderProps {
  onNavigate?: (path: string) => void
}

export default function AppHeader({ onNavigate }: AppHeaderProps) {
  const { employees } = useAppStore()

  return (
    <>
      <div className="text-center mb-6 sm:mb-8">
        {/* App Icon with enhanced design and subtle animation */}
        <div className="inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 rounded-3xl sm:rounded-4xl shadow-2xl mb-6 sm:mb-8 relative overflow-hidden hover:scale-105 transition-transform duration-300 animate-pulse">
          {/* Enhanced background pattern */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent"></div>
          <div className="absolute top-2 right-2 w-4 h-4 bg-white/40 rounded-full animate-pulse"></div>
          <div className="absolute bottom-2 left-2 w-2 h-2 bg-white/20 rounded-full"></div>
          
          {/* Icon with enhanced styling */}
          <svg className="w-10 h-10 sm:w-12 sm:h-12 text-white relative z-10 drop-shadow-lg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
          </svg>
        </div>
        
        {/* Enhanced title with improved gradient and animation */}
        <h1 className="text-3xl sm:text-4xl font-bold mb-3 sm:mb-4 hover:scale-105 transition-transform duration-300">
          <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent animate-gradient bg-300% drop-shadow-sm">
            Did They Work?
          </span>
        </h1>
        
        {/* Enhanced subtitle with colorful styling */}
        <p className="text-slate-600 mb-6 sm:mb-8 text-base sm:text-lg max-w-lg mx-auto leading-relaxed font-medium">
          <span className="bg-gradient-to-r from-slate-700 via-emerald-600 to-teal-600 bg-clip-text text-transparent font-semibold">
            Track work, manage payments, and stay organised
          </span>
        </p>

        {/* Enhanced Welcome Message for New Users */}
        {employees.length === 0 && (
          <div className="mt-6 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border-2 border-blue-200/50 rounded-3xl p-5 max-w-sm mx-auto shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <div className="text-3xl mb-3 animate-bounce">👋</div>
            <h3 className="text-base font-bold bg-gradient-to-r from-blue-700 to-indigo-700 bg-clip-text text-transparent mb-2">
              Welcome to Did They Work?
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Start by adding your first employee to begin tracking work and payments.
            </p>
          </div>
        )}
      </div>
    </>
  )
} 