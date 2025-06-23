'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { firebaseService } from '../../lib/firebase'

interface AuthError {
  code: string
  message: string
}

export default function LoginPage() {
  const router = useRouter()
  const [isLogin, setIsLogin] = useState(true)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Check if user is already authenticated
    const unsubscribe = firebaseService.onAuthStateChanged((user) => {
      if (user && mounted) {
        router.push('/')
      }
    })
    
    return () => unsubscribe()
  }, [router, mounted])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    // Clear error when user starts typing
    if (error) setError('')
  }

  const validateForm = () => {
    if (!formData.email || !formData.password) {
      setError('Please fill in all required fields')
      return false
    }

    if (!formData.email.includes('@')) {
      setError('Please enter a valid email address')
      return false
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters')
      return false
    }

    if (!isLogin && formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return false
    }

    return true
  }

  const getErrorMessage = (error: AuthError): string => {
    switch (error.code) {
      case 'auth/user-not-found':
        return 'No account found with this email address'
      case 'auth/wrong-password':
        return 'Incorrect password'
      case 'auth/email-already-in-use':
        return 'An account with this email already exists'
      case 'auth/weak-password':
        return 'Password should be at least 6 characters'
      case 'auth/invalid-email':
        return 'Please enter a valid email address'
      case 'auth/too-many-requests':
        return 'Too many failed attempts. Please try again later'
      case 'auth/network-request-failed':
        return 'Network error. Please check your connection'
      default:
        return error.message || 'An unexpected error occurred'
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setLoading(true)
    setError('')

    try {
      if (isLogin) {
        await firebaseService.signIn(formData.email, formData.password)
        router.push('/')
      } else {
        await firebaseService.signUp(formData.email, formData.password)
        router.push('/')
      }
    } catch (error: any) {
      console.error('Authentication error:', error)
      setError(getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  const toggleMode = () => {
    setIsLogin(!isLogin)
    setError('')
    setFormData(prev => ({
      ...prev,
      password: '',
      confirmPassword: ''
    }))
  }

  // Don't render until mounted (prevents hydration issues)
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* App Logo and Title */}
        <div className="text-center mb-8">
          {/* App Icon */}
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 rounded-3xl shadow-lg mb-6 relative overflow-hidden">
            {/* Background pattern */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>
            <div className="absolute top-1 right-1 w-3 h-3 bg-white/30 rounded-full"></div>
            
            {/* Icon */}
            <svg className="w-10 h-10 text-white relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold mb-2">
            <span className="text-gradient">My Days</span>
          </h1>
          
          {/* Subtitle */}
          <p className="text-gray-600 text-base">
            {isLogin ? 'Welcome back' : 'Create your account'}
          </p>
        </div>

        {/* Auth Form Card */}
        <div className="card">
          <div className="card-body">
            {/* Form Header */}
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-1">
                {isLogin ? 'Sign In' : 'Create Account'}
              </h2>
              <p className="text-sm text-gray-600">
                {isLogin 
                  ? 'Enter your credentials to access your workspace' 
                  : 'Get started with your employee management'
                }
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                <div className="flex items-start space-x-3">
                  <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h4 className="font-medium text-red-800 text-sm">Authentication Error</h4>
                    <p className="text-red-700 text-sm mt-1">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Auth Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="your@email.com"
                  required
                  disabled={loading}
                />
              </div>

              {/* Password Field */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="Enter your password"
                  required
                  disabled={loading}
                  minLength={6}
                />
              </div>

              {/* Confirm Password Field (Sign Up Only) */}
              {!isLogin && (
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="Confirm your password"
                    required
                    disabled={loading}
                    minLength={6}
                  />
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full btn btn-primary btn-lg mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    {isLogin ? 'Signing In...' : 'Creating Account...'}
                  </div>
                ) : (
                  <>
                    {isLogin ? (
                      <>
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                        </svg>
                        Sign In
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                        </svg>
                        Create Account
                      </>
                    )}
                  </>
                )}
              </button>
            </form>

            {/* Toggle Auth Mode */}
            <div className="mt-6 text-center">
              <p className="text-gray-600 text-sm">
                {isLogin ? "Don't have an account?" : 'Already have an account?'}
              </p>
              <button
                type="button"
                onClick={toggleMode}
                disabled={loading}
                className="mt-2 text-blue-600 hover:text-blue-700 font-medium text-sm underline disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {isLogin ? 'Create a new account' : 'Sign in instead'}
              </button>
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500 max-w-sm mx-auto leading-relaxed">
            By {isLogin ? 'signing in' : 'creating an account'}, you agree to our terms of service and privacy policy. 
            Your data is securely stored and encrypted.
          </p>
        </div>
      </div>
    </div>
  )
} 