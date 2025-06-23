export default function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8 max-w-md">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto mb-6"></div>
              <div className="absolute inset-0 rounded-full h-16 w-16 border-4 border-transparent border-t-blue-400 animate-ping mx-auto"></div>
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Loading Your Workspace</h2>
            <p className="text-gray-600">Setting up your work tracking dashboard...</p>
          </div>
        </div>
      </div>
    </div>
  )
} 