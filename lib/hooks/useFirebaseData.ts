import { useEffect, useRef } from 'react'
import { firebaseService } from '../firebase'
import { useAppStore } from '../store'
import type { Employee, WorkDay, Payment } from '../store'

export const useFirebaseData = () => {
  const {
    employees,
    workDays,
    payments,
    setEmployees,
    setWorkDays,
    setPayments,
    setLoading,
    setSyncStatus,
    setErrorMessage,
    loading
  } = useAppStore()
  
  const hasInitialized = useRef(false)
  const listenersRef = useRef<(() => void)[]>([])

  // Only load data if we don't have any data yet
  const hasData = employees.length > 0 || workDays.length > 0 || payments.length > 0

  // Load initial data only if we don't have data and haven't initialized
  useEffect(() => {
    if (hasData || hasInitialized.current) {
      // If we already have data, don't show loading
      if (hasData) {
        setLoading(false)
        setSyncStatus('synced')
      }
      return
    }
    
    hasInitialized.current = true
    let isMounted = true

    const loadData = async () => {
      try {
        // Only show loading on the very first load
        if (!hasData) {
          setLoading(true)
          setSyncStatus('syncing')
        }
        setErrorMessage('')
        
        // Enable network connection
        await firebaseService.enableNetwork()
        
        // Load initial data
        const [employeesData, workDaysData, paymentsData] = await Promise.all([
          firebaseService.getEmployees(),
          firebaseService.getWorkDays(),
          firebaseService.getPayments()
        ])
        
        if (isMounted) {
          setEmployees(employeesData as Employee[])
          setWorkDays(workDaysData as WorkDay[])
          setPayments(paymentsData as Payment[])
          setSyncStatus('synced')
          setLoading(false)
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
  }, [hasData, setEmployees, setWorkDays, setPayments, setLoading, setSyncStatus, setErrorMessage])

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

    // Store cleanup functions
    listenersRef.current = [
      unsubscribeEmployees,
      unsubscribeWorkDays,
      unsubscribePayments
    ].filter((fn): fn is () => void => typeof fn === 'function')

    return () => {
      isMounted = false
      listenersRef.current.forEach(unsubscribe => unsubscribe?.())
      listenersRef.current = []
    }
  }, [setEmployees, setWorkDays, setPayments, setSyncStatus, setErrorMessage])
} 