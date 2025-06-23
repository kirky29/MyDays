import { useRouter } from 'next/navigation'

export default function AddEmployeeButton() {
  const router = useRouter()

  const navigateToAddEmployee = () => {
    router.push('/add-employee')
  }

  return (
    <div className="text-center py-6">
      <button
        onClick={navigateToAddEmployee}
        className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg"
      >
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
        </svg>
        Add New Employee
      </button>
    </div>
  )
} 