import { useState } from 'react'
import { Mail, Lock, User, Loader2, Zap, AlertCircle, MailCheck, RefreshCw } from 'lucide-react'
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
  // After register: show "check your email" screen
  const [pendingVerification, setPendingVerification] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !password.trim()) return
    setLoading(true)
    setError(null)
    try {
      if (mode === 'register') {
        await authApi.register(email.trim(), password, name.trim() || undefined)
        // PocketBase will throw if email verification is required and user isn't verified yet.
        // If we reach here without throwing, verification is off — go straight in.
        onAuthenticated()
      } else {
        await authApi.login(email.trim(), password)
        onAuthenticated()
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '操作失败，请重试'
      if (msg.includes('verify') || msg.includes('verified') || msg.includes('verification')) {
        // Registration succeeded but email verification is required
        setPendingVerification(true)
      } else if (msg.includes('Failed to authenticate')) {
        setError('邮箱或密码错误')
      } else if (msg.includes('not verified')) {
        setError('邮箱尚未验证，请检查你的邮箱并点击验证链接')
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

  async function handleResend() {
    setResendLoading(true)
    setResendSuccess(false)
    try {
      await authApi.resendVerification(email.trim())
      setResendSuccess(true)
    } catch {
      // silently ignore
    } finally {
      setResendLoading(false)
    }
  }

  // ── Email verification pending screen ────────────────────────────────────────
  if (pendingVerification) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-8">
          <div className="text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-zinc-100 to-zinc-400 flex items-center justify-center mx-auto">
              <span className="text-zinc-900 font-black text-xl font-mono">1</span>
            </div>
            <h1 className="text-2xl font-bold text-zinc-100">JustOne AI</h1>
          </div>

          <div className="card p-8 text-center space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto">
              <MailCheck className="w-7 h-7 text-blue-400" />
            </div>
            <div className="space-y-2">
              <h2 className="text-base font-semibold text-zinc-100">验证邮件已发送</h2>
              <p className="text-sm text-zinc-500 leading-relaxed">
                我们向 <span className="text-zinc-300 font-mono">{email}</span> 发送了一封验证邮件。
              </p>
              <p className="text-sm text-zinc-600">
                点击邮件中的链接后，回来登录即可。
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <Button
                className="w-full"
                onClick={() => {
                  setPendingVerification(false)
                  setMode('login')
                }}
              >
                去登录
              </Button>

              <div className="flex items-center justify-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResend}
                  disabled={resendLoading || resendSuccess}
                  className="text-zinc-500"
                >
                  {resendLoading
                    ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> 发送中...</>
                    : resendSuccess
                    ? <><MailCheck className="w-3.5 h-3.5 text-emerald-400" /> 已重新发送</>
                    : <><RefreshCw className="w-3.5 h-3.5" /> 重新发送验证邮件</>}
                </Button>
              </div>
            </div>
          </div>

          <p className="text-xs text-center text-zinc-700">
            没收到邮件？检查垃圾箱，或联系管理员
          </p>
        </div>
      </div>
    )
  }

  // ── Login / Register form ─────────────────────────────────────────────────────
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
