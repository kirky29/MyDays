import { useRouter } from 'next/navigation'

export default function AddEmployeeButton() {
  const router = useRouter()

  const navigateToAddEmployee = () => {
    router.push('/add-employee')
  }

  return (
    <div className="text-center py-6 sm:py-8">
      <div className="space-y-4">
        <button
          onClick={navigateToAddEmployee}
          className="group relative inline-flex items-center px-6 py-3 sm:px-8 sm:py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out"></div>
          
          <svg className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3 group-hover:rotate-12 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
          
          <span className="relative text-sm sm:text-base">Add New Employee</span>
          
          <svg className="w-4 h-4 sm:w-5 sm:h-5 ml-2 group-hover:translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
        
        <p className="text-xs sm:text-sm text-gray-600 max-w-xs mx-auto">
          Add employees to start tracking their work days and managing payments
        </p>
      </div>
      
      <div className="mt-6 sm:mt-8 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-4 sm:p-6 max-w-sm mx-auto">
        <div className="flex items-center justify-center mb-3">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
        
        <h3 className="text-sm font-semibold text-blue-900 mb-2 text-center">💡 Quick Tip</h3>
        <p className="text-xs text-blue-800 text-center leading-relaxed">
          Set up employee profiles with daily wages to automatically calculate earnings and payments
        </p>
      </div>
    </div>
  )
} 