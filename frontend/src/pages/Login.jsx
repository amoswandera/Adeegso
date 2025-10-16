import React, { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { AuthContext } from '../contexts/AuthContext'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { login } = React.useContext(AuthContext)

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const result = await login(username, password)
      if (result.success) {
        // Login successful - AuthContext handles redirection
        return
      }
    } catch (err) {
      setError('Login failed')
    }
  }

  return (
    <div className="max-w-md mx-auto mt-16 p-6 bg-white rounded shadow">
      <h1 className="text-xl font-semibold mb-4">
        {searchParams.get('role') === 'vendor' ? 'Vendor Login' : 'Login'}
      </h1>

      <form onSubmit={onSubmit} className="space-y-3">
        <input id="username" name="username" value={username} onChange={e=>setUsername(e.target.value)} placeholder="Username" className="w-full border p-2 rounded" autoComplete="username" />
        <input id="password" name="password" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password" className="w-full border p-2 rounded" autoComplete="current-password" />
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button className="bg-brand-green text-white px-4 py-2 rounded w-full">Sign in</button>
      </form>

      <div className="mt-4 text-center">
        <p className="text-sm text-gray-600">Don't have an account?</p>
        <Link to="/register" className="text-brand-blue hover:text-brand-blue/80 text-sm">
          Register here
        </Link>
      </div>
    </div>
  )
}


