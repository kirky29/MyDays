export default function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center">
      <div className="container mx-auto px-4 py-8 max-w-md">
        <div className="text-center">
          {/* Enhanced Loading Animation */}
          <div className="relative mb-8">
            {/* Main spinner */}
            <div className="animate-spin rounded-full h-16 w-16 sm:h-20 sm:w-20 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
            
            {/* Outer pulse ring */}
            <div className="absolute inset-0 rounded-full h-16 w-16 sm:h-20 sm:w-20 border-4 border-transparent border-t-blue-400 animate-ping mx-auto opacity-75"></div>
            
            {/* Inner dot */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
          </div>
          
          {/* Loading Content */}
          <div className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
              Loading Your Workspace
            </h2>
            <p className="text-gray-600 text-sm sm:text-base max-w-xs mx-auto leading-relaxed">
              Setting up your work tracking dashboard...
            </p>
            
            {/* Loading Steps */}
            <div className="mt-8 space-y-3">
              {[
                { step: "Connecting to database", delay: "0ms" },
                { step: "Loading employees", delay: "500ms" },
                { step: "Syncing work data", delay: "1000ms" }
              ].map((item, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-center space-x-3 text-sm text-gray-600"
                  style={{ animationDelay: item.delay }}
                >
                  <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse"></div>
                  <span className="animate-pulse">{item.step}</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* App Preview Card */}
          <div className="mt-12 bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-sm">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <span className="font-semibold text-gray-900">Did They Work?</span>
            </div>
            
            {/* Skeleton content */}
            <div className="space-y-3">
              <div className="h-3 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-3 bg-gray-200 rounded animate-pulse w-3/4 mx-auto"></div>
              <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2 mx-auto"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 