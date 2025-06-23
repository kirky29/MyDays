import { useEffect } from 'react'
import { firebaseService } from '../firebase'
import { useAppStore } from '../store'
import type { Employee, WorkDay, Payment } from '../store'

export const useFirebaseData = () => {
  const {
    setEmployees,
    setWorkDays,
    setPayments,
    setLoading,
    setSyncStatus,
    setErrorMessage
  } = useAppStore()

  // Load initial data
  useEffect(() => {
    let isMounted = true

    const loadData = async () => {
      try {
        setLoading(true)
        setSyncStatus('syncing')
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
        }
      } catch (error: any) {
        console.error('Error loading data:', error)
        if (isMounted) {
          setSyncStatus('error')
          setErrorMessage(error.message || 'Failed to connect to database')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadData()

    return () => {
      isMounted = false
    }
  }, [setEmployees, setWorkDays, setPayments, setLoading, setSyncStatus, setErrorMessage])

  // Set up real-time listeners
  useEffect(() => {
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

    return () => {
      isMounted = false
      if (unsubscribeEmployees) unsubscribeEmployees()
      if (unsubscribeWorkDays) unsubscribeWorkDays()
      if (unsubscribePayments) unsubscribePayments()
    }
  }, [setEmployees, setWorkDays, setPayments, setSyncStatus, setErrorMessage])
} 