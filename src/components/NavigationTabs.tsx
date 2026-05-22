"use client"

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { LayoutDashboard, Wallet, TrendingUp, LogOut } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

interface NavigationTabsProps {
  activePage: 'dashboard' | 'encaissements' | 'chiffre-affaires'
}

export function NavigationTabs({ activePage }: NavigationTabsProps) {
  const { user, signOut } = useAuth()
  const router = useRouter()

  async function handleSignOut() {
    await signOut()
    router.replace('/login')
  }

  return (
    <div className="flex items-center gap-4">
      <nav className="flex items-center gap-1">
        <Link
          href="/"
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activePage === 'dashboard'
              ? 'bg-slate-800 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <LayoutDashboard className="h-4 w-4" />
          Tableau de bord
        </Link>
        <Link
          href="/encaissements"
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activePage === 'encaissements'
              ? 'bg-emerald-700 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Wallet className="h-4 w-4" />
          Encaissements
        </Link>
        <Link
          href="/chiffre-affaires"
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activePage === 'chiffre-affaires'
              ? 'bg-violet-700 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <TrendingUp className="h-4 w-4" />
          Chiffre d'affaires
        </Link>
      </nav>

      {user && (
        <div className="flex items-center gap-2 pl-4 border-l border-slate-200">
          <span className="text-xs text-slate-500 hidden sm:block">{user.email}</span>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Se déconnecter"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:block">Déconnexion</span>
          </button>
        </div>
      )}
    </div>
  )
}
