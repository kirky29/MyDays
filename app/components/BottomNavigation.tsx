'use client'

import { usePathname } from 'next/navigation'

interface BottomNavigationProps {
  onNavigate: (path: string) => void
}

export default function BottomNavigation({ onNavigate }: BottomNavigationProps) {
  const pathname = usePathname()

  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      path: '/',
      icon: (active: boolean) => (
        <svg className={`w-5 h-5 sm:w-6 sm:h-6 transition-all duration-200 ${active ? 'text-blue-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.5 : 2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.5 : 2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v3H8V5z" />
        </svg>
      )
    },
    {
      id: 'team',
      label: 'Team',
      path: '/team',
      icon: (active: boolean) => (
        <svg className={`w-5 h-5 sm:w-6 sm:h-6 transition-all duration-200 ${active ? 'text-blue-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.5 : 2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )
    },
    {
      id: 'calendar',
      label: 'Calendar',
      path: '/calendar',
      icon: (active: boolean) => (
        <svg className={`w-5 h-5 sm:w-6 sm:h-6 transition-all duration-200 ${active ? 'text-blue-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.5 : 2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      id: 'settings',
      label: 'Settings',
      path: '/settings',
      icon: (active: boolean) => (
        <svg className={`w-5 h-5 sm:w-6 sm:h-6 transition-all duration-200 ${active ? 'text-blue-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.5 : 2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.5 : 2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    }
  ]

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      {/* Background with blur effect */}
      <div className="absolute inset-0 bg-white/90 backdrop-blur-lg border-t border-gray-200/50"></div>
      
      {/* Navigation content */}
      <div className="relative px-4 pt-2 pb-4 safe-area-pb">
        <div className="flex items-center justify-around max-w-md mx-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.path
            
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.path)}
                className={`
                  relative flex flex-col items-center space-y-1 p-2 rounded-xl transition-all duration-200 touch-target
                  ${isActive 
                    ? 'bg-blue-50 scale-105' 
                    : 'hover:bg-gray-50 active:scale-95'
                  }
                `}
                aria-label={`Navigate to ${item.label}`}
              >
                {/* Active indicator */}
                {isActive && (
                  <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-600 rounded-full"></div>
                )}
                
                {/* Icon with enhanced states */}
                <div className={`transition-all duration-200 ${isActive ? 'transform -translate-y-0.5' : ''}`}>
                  {item.icon(isActive)}
                </div>
                
                {/* Label with better typography */}
                <span className={`
                  text-xs font-medium transition-all duration-200
                  ${isActive 
                    ? 'text-blue-600 font-semibold' 
                    : 'text-gray-600'
                  }
                `}>
                  {item.label}
                </span>
                
                {/* Ripple effect on tap */}
                <div className={`
                  absolute inset-0 rounded-xl transition-all duration-300 opacity-0
                  ${isActive ? '' : 'active:opacity-20 active:bg-gray-300'}
                `}></div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
} 