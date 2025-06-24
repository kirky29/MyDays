import { useEffect } from 'react'

/**
 * Custom hook to prevent body scroll when modal is open
 * @param isOpen - Whether the modal is open
 */
export function useBodyScrollLock(isOpen: boolean) {
  useEffect(() => {
    if (isOpen) {
      // Save the current scroll position
      const scrollY = window.scrollY
      
      // Apply styles to prevent scrolling
      document.body.style.position = 'fixed'
      document.body.style.top = `-${scrollY}px`
      document.body.style.width = '100%'
      document.body.style.overflow = 'hidden'
      
      return () => {
        // Restore scrolling
        document.body.style.position = ''
        document.body.style.top = ''
        document.body.style.width = ''
        document.body.style.overflow = ''
        
        // Restore scroll position
        window.scrollTo(0, scrollY)
      }
    }
  }, [isOpen])
} 