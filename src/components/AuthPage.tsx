import { useState } from 'react'
import { Mail, Lock, User, Loader2, Zap, AlertCircle } from 'lucide-react'
import { authApi } from '../services/pb'
import { Button } from './ui/button'
import { Input } from './ui/input'

interface AuthPageProps {
  onAuthenticated: () => void
}

export function AuthPage({ onAuthenticated }: AuthPageProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !password.trim()) return
    setLoading(true)
    setError(null)
    try {
      if (mode === 'register') {
        await authApi.register(email.trim(), password, name.trim() || undefined)
      } else {
        await authApi.login(email.trim(), password)
      }
      onAuthenticated()
    } catch (err) {
      const msg = err instanceof Error ? err.message : '操作失败，请重试'
      // Make PocketBase error messages friendlier
      if (msg.includes('Failed to authenticate')) {
        setError('邮箱或密码错误')
      } else if (msg.includes('already exists')) {
        setError('该邮箱已注册，请直接登录')
      } else if (msg.includes('password')) {
        setError('密码至少需要 8 位')
      } else {
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Brand */}
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-zinc-100 to-zinc-400 flex items-center justify-center mx-auto">
            <span className="text-zinc-900 font-black text-xl font-mono">1</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-100">JustOne AI</h1>
            <p className="text-sm text-zinc-500 mt-1">个人优先级对齐工具</p>
          </div>
        </div>

        {/* Card */}
        <div className="card p-8 space-y-6">
          {/* Tab toggle */}
          <div className="flex rounded-lg bg-zinc-800 p-1">
            {(['login', 'register'] as const).map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(null) }}
                className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-all ${
                  mode === m
                    ? 'bg-zinc-700 text-zinc-100 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {m === 'login' ? '登录' : '注册'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">昵称（可选）</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                  <Input
                    placeholder="你的名字"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400">邮箱</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="pl-9"
                  autoFocus
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400">密码</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                <Input
                  type="password"
                  placeholder={mode === 'register' ? '至少 8 位' : '••••••••'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="pl-9"
                  autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <p className="text-xs text-red-400">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={loading || !email.trim() || !password.trim()}
            >
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> {mode === 'login' ? '登录中...' : '注册中...'}</>
                : <><Zap className="w-4 h-4" /> {mode === 'login' ? '登录' : '创建账户'}</>}
            </Button>
          </form>

          <p className="text-xs text-center text-zinc-600">
            {mode === 'login' ? '还没有账户？' : '已有账户？'}
            <button
              onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(null) }}
              className="text-zinc-400 hover:text-zinc-200 ml-1 underline underline-offset-2"
            >
              {mode === 'login' ? '立即注册' : '去登录'}
            </button>
          </p>
        </div>

        <p className="text-xs text-center text-zinc-700">
          数据存储在你自己的 PocketBase 实例，完全私有
        </p>
      </div>
    </div>
  )
}
