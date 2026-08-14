import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, type LoginPayload, type SignupPayload, type UpdateProfilePayload } from '../api/client'
import type { User } from '../types/document'

interface AuthContextValue {
  user: User | null
  isLoading: boolean
  login: (payload: LoginPayload) => Promise<void>
  signup: (payload: SignupPayload) => Promise<void>
  logout: () => Promise<void>
  updateProfile: (payload: UpdateProfilePayload) => Promise<void>
  uploadLogo: (file: File) => Promise<void>
  removeLogo: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    api
      .me()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false))
  }, [])

  const login = async (payload: LoginPayload) => {
    const loggedInUser = await api.login(payload)
    setUser(loggedInUser)
  }

  const signup = async (payload: SignupPayload) => {
    const newUser = await api.signup(payload)
    setUser(newUser)
  }

  const logout = async () => {
    await api.logout()
    setUser(null)
  }

  const updateProfile = async (payload: UpdateProfilePayload) => {
    const updatedUser = await api.updateProfile(payload)
    setUser(updatedUser)
  }

  const uploadLogo = async (file: File) => {
    const updatedUser = await api.uploadLogo(file)
    setUser(updatedUser)
  }

  const removeLogo = async () => {
    const updatedUser = await api.removeLogo()
    setUser(updatedUser)
  }

  return (
    <AuthContext.Provider
      value={{ user, isLoading, login, signup, logout, updateProfile, uploadLogo, removeLogo }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider')
  }
  return context
}
