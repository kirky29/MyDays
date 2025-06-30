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
      
      // Detect iOS devices (simplified detection)
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
      
      if (isIOS) {
        // On iOS, just prevent scrolling without changing position
        document.body.style.overflow = 'hidden'
        document.body.style.height = '100vh'
        // Set webkit overflow scrolling for iOS
        ;(document.body.style as any).webkitOverflowScrolling = 'touch'
      } else {
        // Apply styles to prevent scrolling on other devices
        document.body.style.position = 'fixed'
        document.body.style.top = `-${scrollY}px`
        document.body.style.width = '100%'
        document.body.style.overflow = 'hidden'
      }
      
      return () => {
        // Restore scrolling
        document.body.style.position = ''
        document.body.style.top = ''
        document.body.style.width = ''
        document.body.style.overflow = ''
        document.body.style.height = ''
        ;(document.body.style as any).webkitOverflowScrolling = ''
        
        // Restore scroll position (only for non-iOS devices)
        if (!isIOS) {
          window.scrollTo(0, scrollY)
        }
      }
    }
  }, [isOpen])
} 