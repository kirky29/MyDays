'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface NavItem {
  name: string
  path: string
  icon: (isActive: boolean) => JSX.Element
}

const navItems: NavItem[] = [
  {
    name: 'Dashboard',
    path: '/',
    icon: (isActive) => (
      <svg 
        className={`w-4 h-4 transition-all duration-200 ${isActive ? 'text-white' : 'text-gray-500'}`} 
        fill={isActive ? 'currentColor' : 'none'} 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={isActive ? 0 : 2.5} 
          d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2 2z" 
        />
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={isActive ? 0 : 2.5} 
          d="M8 5v4m8-4v4" 
        />
      </svg>
    )
  },
  {
    name: 'Calendar',
    path: '/all-schedules',
    icon: (isActive) => (
      <svg 
        className={`w-4 h-4 transition-all duration-200 ${isActive ? 'text-white' : 'text-gray-500'}`} 
        fill={isActive ? 'currentColor' : 'none'} 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={isActive ? 0 : 2.5} 
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" 
        />
      </svg>
    )
  },
  {
    name: 'Reports',
    path: '/work-history',
    icon: (isActive) => (
      <svg 
        className={`w-4 h-4 transition-all duration-200 ${isActive ? 'text-white' : 'text-gray-500'}`} 
        fill={isActive ? 'currentColor' : 'none'} 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={isActive ? 0 : 2.5} 
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" 
        />
      </svg>
    )
  },
  {
    name: 'Settings',
    path: '/settings',
    icon: (isActive) => (
      <svg 
        className={`w-4 h-4 transition-all duration-200 ${isActive ? 'text-white' : 'text-gray-500'}`} 
        fill={isActive ? 'currentColor' : 'none'} 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={isActive ? 0 : 2.5} 
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" 
        />
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={isActive ? 0 : 2.5} 
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" 
        />
      </svg>
    )
  }
]

export default function BottomNavigation() {
  const router = useRouter()
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Don't show navigation on login page
  if (!mounted || pathname === '/login') {
    return null
  }

  const handleNavigation = (path: string) => {
    router.push(path)
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      {/* Main navigation container */}
      <div className="bg-white/98 backdrop-blur-xl border-t border-gray-100">
        <div className="flex justify-around items-center px-2 py-3 max-w-md mx-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.path
            
            return (
              <button
                key={item.name}
                onClick={() => handleNavigation(item.path)}
                className={`flex flex-col items-center justify-center py-2 px-3 rounded-xl transition-all duration-200 min-w-[70px] relative group ${
                  isActive 
                    ? '' 
                    : 'hover:bg-gray-50'
                }`}
              >
                {/* Icon container with better styling */}
                <div className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200 mb-1 ${
                  isActive 
                    ? 'bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg' 
                    : 'group-hover:bg-gray-100'
                }`}>
                  {item.icon(isActive)}
                </div>
                
                {/* Label */}
                <span 
                  className={`text-xs font-medium transition-all duration-200 ${
                    isActive 
                      ? 'text-blue-600' 
                      : 'text-gray-500 group-hover:text-gray-700'
                  }`}
                >
                  {item.name}
                </span>
                
                {/* Active indicator dot */}
                {isActive && (
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-500 rounded-full" />
                )}
              </button>
            )
          })}
        </div>
        
        {/* Enhanced iOS safe area padding */}
        <div className="pb-safe-bottom bg-white/98" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 16px)' }} />
      </div>
    </div>
  )
} 