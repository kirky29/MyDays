'use client'

import { useState, useEffect, createContext, useContext } from 'react'
import { User } from 'firebase/auth'
import { firebaseService } from '../firebase'

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const useAuthState = () => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = firebaseService.onAuthStateChanged((user) => {
      setUser(user)
      setLoading(false)
    })

    return unsubscribe
  }, [])

  const signIn = async (email: string, password: string) => {
    setLoading(true)
    try {
      await firebaseService.signIn(email, password)
    } finally {
      setLoading(false)
    }
  }

  const signUp = async (email: string, password: string) => {
    setLoading(true)
    try {
      await firebaseService.signUp(email, password)
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    setLoading(true)
    try {
      await firebaseService.signOut()
    } finally {
      setLoading(false)
    }
  }

  return {
    user,
    loading,
    signIn,
    signUp,
    signOut
  }
} 