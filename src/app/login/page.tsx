"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TrendingUp } from 'lucide-react'

export default function LoginPage() {
  const { user, loading, signIn, signUp } = useAuth()
  const router = useRouter()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!loading && user) {
      router.replace('/')
    }
  }, [loading, user, router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setInfo('')
    setSubmitting(true)
    try {
      if (mode === 'login') {
        await signIn(email, password)
        router.replace('/')
      } else {
        await signUp(email, password)
        setInfo('Compte créé. Vérifiez votre email pour confirmer votre inscription, puis connectez-vous.')
        setMode('login')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-slate-200 border-t-slate-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="bg-slate-800 text-white rounded-xl p-2.5">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800 leading-none">
              Pilotage Commissionnement
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">Réseau Mandataires</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
          {/* Tabs */}
          <div className="flex rounded-lg bg-slate-100 p-1 mb-6">
            <button
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                mode === 'login' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'
              }`}
              onClick={() => { setMode('login'); setError(''); setInfo('') }}
            >
              Se connecter
            </button>
            <button
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                mode === 'register' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'
              }`}
              onClick={() => { setMode('register'); setError(''); setInfo('') }}
            >
              Créer un compte
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="vous@exemple.com"
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={mode === 'register' ? 'Minimum 6 caractères' : '••••••••'}
                required
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                minLength={6}
              />
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </div>
            )}
            {info && (
              <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                {info}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting
                ? 'Chargement...'
                : mode === 'login'
                ? 'Se connecter'
                : 'Créer mon compte'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
