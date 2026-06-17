import { useState, useEffect } from 'react'
import {
  Key, Trash2, BarChart2, CheckCircle2, AlertCircle, Database, LogOut, User
} from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogBody, DialogFooter,
} from './ui/dialog'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { clearAllData, checkConnection, authApi } from '../services/pb'
import { WeeklyReport } from './WeeklyReport'

interface NavbarProps {
  onApiConfigSaved: () => void
  onLogout: () => void
}

export function Navbar({ onApiConfigSaved, onLogout }: NavbarProps) {
  const [apiOpen, setApiOpen] = useState(false)
  const [clearOpen, setClearOpen] = useState(false)
  const [weeklyOpen, setWeeklyOpen] = useState(false)
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('gemini_api_key') || '')
  const [apiEndpoint, setApiEndpoint] = useState(
    () => localStorage.getItem('gemini_endpoint') ||
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent'
  )
  const [clearing, setClearing] = useState(false)
  const [pbConnected, setPbConnected] = useState<boolean | null>(null)

  useEffect(() => {
    checkConnection().then(setPbConnected)
    const id = setInterval(() => checkConnection().then(setPbConnected), 15000)
    return () => clearInterval(id)
  }, [])

  const today = new Date().toLocaleDateString('zh-CN', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
  })

  function saveApiConfig() {
    localStorage.setItem('gemini_api_key', apiKey.trim())
    localStorage.setItem('gemini_endpoint', apiEndpoint.trim())
    setApiOpen(false)
    onApiConfigSaved()
  }

  async function handleClearData() {
    setClearing(true)
    try { await clearAllData() }
    finally { setClearing(false); setClearOpen(false) }
  }

  const hasApiKey = !!localStorage.getItem('gemini_api_key')
  const isFriday = new Date().getDay() === 5

  return (
    <>
      <header className="flex items-center justify-between px-6 py-3 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-40">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-zinc-100 to-zinc-400 flex items-center justify-center">
            <span className="text-zinc-900 font-black text-xs font-mono">1</span>
          </div>
          <span className="font-semibold text-zinc-100 tracking-tight">
            JustOne <span className="text-zinc-500 font-normal">AI</span>
          </span>
          {/* DB status */}
          <div
            className="flex items-center gap-1.5 ml-1"
            title={pbConnected === null ? '检查中...' : pbConnected ? 'PocketBase 已连接' : '请运行 ./start-pb.sh'}
          >
            <Database className={`w-3 h-3 ${
              pbConnected === null ? 'text-zinc-600' :
              pbConnected ? 'text-emerald-500' : 'text-red-500'
            }`} />
            <span className={`text-xs font-mono ${
              pbConnected === null ? 'text-zinc-600' :
              pbConnected ? 'text-emerald-600' : 'text-red-500'
            }`}>
              {pbConnected === null ? '...' : pbConnected ? 'DB' : 'DB 离线'}
            </span>
          </div>
        </div>

        {/* Date */}
        <span className="text-zinc-500 text-xs font-mono hidden sm:block">{today}</span>

        {/* Actions */}
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setWeeklyOpen(true)}
            className={isFriday ? 'text-amber-400 hover:text-amber-300' : ''}
            title="每周报告"
          >
            <BarChart2 className="w-3.5 h-3.5" />
            {isFriday && <span>周报</span>}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setApiOpen(true)}
            className={hasApiKey ? 'text-emerald-400 hover:text-emerald-300' : 'text-amber-400 hover:text-amber-300'}
          >
            {hasApiKey
              ? <CheckCircle2 className="w-3.5 h-3.5" />
              : <Key className="w-3.5 h-3.5" />}
            <span>{hasApiKey ? 'API 已配置' : 'API 配置'}</span>
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setClearOpen(true)} title="清空所有数据">
            <Trash2 className="w-3.5 h-3.5 text-zinc-500" />
          </Button>
          {/* User + logout */}
          <div className="flex items-center gap-1.5 ml-1 pl-1.5 border-l border-zinc-800">
            <div className="flex items-center gap-1.5 text-xs text-zinc-500">
              <User className="w-3 h-3" />
              <span className="font-mono truncate max-w-[100px]">
                {authApi.currentUser?.name || authApi.currentUser?.email || 'User'}
              </span>
            </div>
            <Button
              variant="ghost" size="icon"
              onClick={() => { authApi.logout(); onLogout(); }}
              title="退出登录"
            >
              <LogOut className="w-3.5 h-3.5 text-zinc-500" />
            </Button>
          </div>
        </div>
      </header>

      {weeklyOpen && <WeeklyReport onClose={() => setWeeklyOpen(false)} />}

      {/* API Config Dialog */}
      <Dialog open={apiOpen} onOpenChange={setApiOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>API 配置</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400">Gemini API Key</label>
              <Input
                type="password"
                placeholder="AIza..."
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                className="font-mono"
              />
              <p className="text-xs text-zinc-600">仅存储在本地 localStorage，不会上传到任何服务器。</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400">API Endpoint（支持代理）</label>
              <Input
                type="url"
                placeholder="https://..."
                value={apiEndpoint}
                onChange={e => setApiEndpoint(e.target.value)}
                className="font-mono text-xs"
              />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setApiOpen(false)}>取消</Button>
            <Button size="sm" onClick={saveApiConfig}>保存配置</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clear Data Dialog */}
      <Dialog open={clearOpen} onOpenChange={setClearOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>清空所有数据</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <div className="flex items-start gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-400">此操作不可撤销</p>
                <p className="text-xs text-zinc-400 mt-1">将永久清除所有愿景、里程碑、任务和复盘记录。</p>
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setClearOpen(false)}>取消</Button>
            <Button variant="danger" size="sm" onClick={handleClearData} disabled={clearing}>
              {clearing ? '清除中...' : '确认清空'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
