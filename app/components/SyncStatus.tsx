import { useAppStore } from '../../lib/store'

export default function SyncStatus() {
  const { syncStatus, errorMessage, retryConnection } = useAppStore()

  return (
    <>
      {/* Sync Status Indicator */}
      <div className="mb-6 flex items-center justify-center">
        <div className={`flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium backdrop-blur-sm ${
          syncStatus === 'syncing' ? 'bg-amber-100/80 text-amber-800 border border-amber-200' :
          syncStatus === 'synced' ? 'bg-emerald-100/80 text-emerald-800 border border-emerald-200' :
          'bg-red-100/80 text-red-800 border border-red-200'
        }`}>
          <div className={`w-2 h-2 rounded-full ${
            syncStatus === 'syncing' ? 'bg-amber-500 animate-pulse' :
            syncStatus === 'synced' ? 'bg-emerald-500' :
            'bg-red-500'
          }`}></div>
          <span>
            {syncStatus === 'syncing' ? 'Syncing...' :
             syncStatus === 'synced' ? 'All Synced' :
             'Sync Error'}
          </span>
        </div>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                <svg className="h-5 w-5 text-red-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-semibold text-red-800">Connection Issue</h3>
              <p className="mt-1 text-sm text-red-700">{errorMessage}</p>
              <button
                onClick={retryConnection}
                className="mt-3 inline-flex items-center px-3 py-1.5 border border-red-300 text-sm font-medium rounded-lg text-red-700 bg-red-50 hover:bg-red-100 transition-colors"
              >
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Retry Connection
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
} 