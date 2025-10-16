import React, { createContext, useEffect, useMemo, useState } from 'react'
import { loginWithPassword, setAuthToken } from '../lib/api'

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [tokens, setTokens] = useState(() => {
    const raw = sessionStorage.getItem('tokens')
    return raw ? JSON.parse(raw) : null
  })

  useEffect(() => {
    if (tokens?.access) {
      setAuthToken(tokens.access)
      sessionStorage.setItem('tokens', JSON.stringify(tokens))
    } else {
      setAuthToken(null)
      sessionStorage.removeItem('tokens')
    }
  }, [tokens])

  const signIn = async (username, password) => {
    const data = await loginWithPassword(username, password)
    setTokens(data)
    return data
  }

  const signOut = () => setTokens(null)

  const value = useMemo(() => ({ tokens, signIn, signOut }), [tokens])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}


