"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TrendingUp } from 'lucide-react'

export default function LoginPage() {
  const { user, loading, authError, signIn } = useAuth()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!loading && user) {
      router.replace('/')
    }
  }, [loading, user, router])

  useEffect(() => {
    if (!loading && !user && authError) {
      setError(authError)
    }
  }, [authError, loading, user])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await signIn(email, password)
      router.replace('/')
    } catch (err) {
      if (err instanceof Error && err.message === "Configuration d'accès manquante") {
        setError(err.message)
      } else if (err instanceof Error && err.message === 'Accès non autorisé') {
        setError(err.message)
      } else {
        setError('Identifiants incorrects ou accès non autorisé.')
      }
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
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-slate-900">Connexion sécurisée</h2>
            <p className="text-sm text-slate-500 mt-1">Accès réservé aux utilisateurs autorisés</p>
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
                placeholder="Mot de passe"
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Connexion...' : 'Se connecter'}
            </Button>

            <p className="text-sm text-slate-500 text-center">
              Si vous n’avez pas d’accès, contactez l’administrateur.
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
