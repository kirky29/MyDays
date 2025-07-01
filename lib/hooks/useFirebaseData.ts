import { useEffect, useRef } from 'react'
import { firebaseService } from '../firebase'
import { useAppStore } from '../store'
import type { Employee, WorkDay, Payment, DayNote } from '../store'

// Global flag to track if we've ever loaded data in this session
let hasEverLoadedData = false

export const useFirebaseData = () => {
  const {
    employees,
    workDays,
    payments,
    dayNotes,
    setEmployees,
    setWorkDays,
    setPayments,
    setDayNotes,
    setLoading,
    setSyncStatus,
    setErrorMessage,
    loading
  } = useAppStore()
  
  const hasInitialized = useRef(false)
  const listenersRef = useRef<(() => void)[]>([])

  // Only load data if we don't have any data yet
  const hasData = employees.length > 0 || workDays.length > 0 || payments.length > 0 || dayNotes.length > 0

  // Load initial data only if we don't have data and haven't initialized
  useEffect(() => {
    if (hasData || hasInitialized.current) {
      // If we already have data, don't show loading
      if (hasData) {
        setLoading(false)
        setSyncStatus('synced')
        hasEverLoadedData = true
      }
      return
    }
    
    hasInitialized.current = true
    let isMounted = true

    const loadData = async () => {
      try {
        // Only show loading screen if we've never loaded data before (first app load)
        if (!hasData && !hasEverLoadedData) {
          setLoading(true)
          setSyncStatus('syncing')
        }
        setErrorMessage('')
        
        // Enable network connection
        await firebaseService.enableNetwork()
        
        // Load initial data
        const [employeesData, workDaysData, paymentsData, dayNotesData] = await Promise.all([
          firebaseService.getEmployees(),
          firebaseService.getWorkDays(),
          firebaseService.getPayments(),
          firebaseService.getDayNotes()
        ])
        
        if (isMounted) {
          setEmployees(employeesData as Employee[])
          setWorkDays(workDaysData as WorkDay[])
          setPayments(paymentsData as Payment[])
          setDayNotes(dayNotesData as DayNote[])
          setSyncStatus('synced')
          setLoading(false)
          hasEverLoadedData = true
        }
      } catch (error: any) {
        console.error('Error loading data:', error)
        if (isMounted) {
          setSyncStatus('error')
          setErrorMessage(error.message || 'Failed to connect to database')
          setLoading(false)
        }
      }
    }

    loadData()

    return () => {
      isMounted = false
    }
  }, [hasData, setEmployees, setWorkDays, setPayments, setDayNotes, setLoading, setSyncStatus, setErrorMessage])

  // Set up real-time listeners only once
  useEffect(() => {
    if (listenersRef.current.length > 0) return // Already have listeners
    
    let isMounted = true

    const unsubscribeEmployees = firebaseService.subscribeToEmployees(
      (employeesData) => {
        if (isMounted) {
          setEmployees(employeesData as Employee[])
          setSyncStatus('synced')
          setErrorMessage('')
        }
      },
      (error: any) => {
        if (isMounted) {
          console.error('Employees subscription error:', error)
          setSyncStatus('error')
          setErrorMessage(`Employees sync error: ${error.message}`)
        }
      }
    )

    const unsubscribeWorkDays = firebaseService.subscribeToWorkDays(
      (workDaysData) => {
        if (isMounted) {
          setWorkDays(workDaysData as WorkDay[])
          setSyncStatus('synced')
          setErrorMessage('')
        }
      },
      (error: any) => {
        if (isMounted) {
          console.error('Work days subscription error:', error)
          setSyncStatus('error')
          setErrorMessage(`Work days sync error: ${error.message}`)
        }
      }
    )

    const unsubscribePayments = firebaseService.subscribeToPayments(
      (paymentsData) => {
        if (isMounted) {
          setPayments(paymentsData as Payment[])
          setSyncStatus('synced')
          setErrorMessage('')
        }
      },
      (error: any) => {
        if (isMounted) {
          console.error('Payments subscription error:', error)
          setSyncStatus('error')
          setErrorMessage(`Payments sync error: ${error.message}`)
        }
      }
    )

    const unsubscribeDayNotes = firebaseService.subscribeToDayNotes(
      (dayNotesData) => {
        if (isMounted) {
          setDayNotes(dayNotesData as DayNote[])
          setSyncStatus('synced')
          setErrorMessage('')
        }
      },
      (error: any) => {
        if (isMounted) {
          console.error('Day notes subscription error:', error)
          setSyncStatus('error')
          setErrorMessage(`Day notes sync error: ${error.message}`)
        }
      }
    )

    // Store cleanup functions
    listenersRef.current = [
      unsubscribeEmployees,
      unsubscribeWorkDays,
      unsubscribePayments,
      unsubscribeDayNotes
    ].filter((fn): fn is () => void => typeof fn === 'function')

    return () => {
      isMounted = false
      listenersRef.current.forEach(unsubscribe => unsubscribe?.())
      listenersRef.current = []
    }
  }, [setEmployees, setWorkDays, setPayments, setDayNotes, setSyncStatus, setErrorMessage])
} 