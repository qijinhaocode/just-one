import { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { clearAllData, checkConnection } from '../services/pb';

interface NavbarProps {
  onApiConfigSaved: () => void;
}

export function Navbar({ onApiConfigSaved }: NavbarProps) {
  const [apiModalOpen, setApiModalOpen] = useState(false);
  const [clearModalOpen, setClearModalOpen] = useState(false);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('gemini_api_key') || '');
  const [apiEndpoint, setApiEndpoint] = useState(
    () => localStorage.getItem('gemini_endpoint') ||
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent'
  );
  const [clearing, setClearing] = useState(false);
  const [pbConnected, setPbConnected] = useState<boolean | null>(null);

  useEffect(() => {
    checkConnection().then(setPbConnected);
    const interval = setInterval(() => checkConnection().then(setPbConnected), 15000);
    return () => clearInterval(interval);
  }, []);

  const today = new Date();
  const dateStr = today.toLocaleDateString('zh-CN', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
  });

  function saveApiConfig() {
    localStorage.setItem('gemini_api_key', apiKey.trim());
    localStorage.setItem('gemini_endpoint', apiEndpoint.trim());
    setApiModalOpen(false);
    onApiConfigSaved();
  }

  async function handleClearData() {
    setClearing(true);
    try {
      await clearAllData();
    } finally {
      setClearing(false);
      setClearModalOpen(false);
    }
  }

  const hasApiKey = !!localStorage.getItem('gemini_api_key');

  return (
    <>
      <header className="flex items-center justify-between px-6 py-3 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-zinc-100 to-zinc-400 flex items-center justify-center">
            <span className="text-zinc-900 font-black text-xs font-mono">1</span>
          </div>
          <span className="font-semibold text-zinc-100 tracking-tight">
            JustOne <span className="text-zinc-500 font-normal">AI</span>
          </span>
          {/* PocketBase connection indicator */}
          <div className="flex items-center gap-1.5 ml-1" title={pbConnected === null ? '检查连接中...' : pbConnected ? 'PocketBase 已连接' : 'PocketBase 未连接，请运行 ./start-pb.sh'}>
            <div className={`w-1.5 h-1.5 rounded-full ${pbConnected === null ? 'bg-zinc-600' : pbConnected ? 'bg-emerald-400' : 'bg-red-400 animate-pulse'}`} />
            <span className={`text-xs font-mono ${pbConnected === null ? 'text-zinc-600' : pbConnected ? 'text-emerald-600' : 'text-red-500'}`}>
              {pbConnected === null ? '...' : pbConnected ? 'DB' : 'DB 离线'}
            </span>
          </div>
        </div>

        <span className="text-zinc-500 text-xs font-mono hidden sm:block">{dateStr}</span>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setApiModalOpen(true)}
            className={`btn-ghost flex items-center gap-1.5 ${hasApiKey ? 'text-emerald-400' : 'text-amber-400'}`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
            <span className="text-xs">{hasApiKey ? 'API 已配置' : 'API 配置'}</span>
          </button>
          <button onClick={() => setClearModalOpen(true)} className="btn-ghost text-zinc-500" title="清空所有数据">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </header>

      <Modal isOpen={apiModalOpen} onClose={() => setApiModalOpen(false)} title="API 配置">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-zinc-400 block mb-1.5">Gemini API Key</label>
            <input type="password" className="input-field font-mono" placeholder="AIza..."
              value={apiKey} onChange={e => setApiKey(e.target.value)} />
            <p className="text-xs text-zinc-600 mt-1">仅存储在本地 localStorage，不会上传到任何服务器。</p>
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-400 block mb-1.5">API Endpoint（支持代理）</label>
            <input type="url" className="input-field font-mono text-xs" placeholder="https://..."
              value={apiEndpoint} onChange={e => setApiEndpoint(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setApiModalOpen(false)} className="btn-ghost">取消</button>
            <button onClick={saveApiConfig} className="btn-primary">保存配置</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={clearModalOpen} onClose={() => setClearModalOpen(false)} title="清空所有数据">
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <svg className="w-5 h-5 text-red-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-red-400">此操作不可撤销</p>
              <p className="text-xs text-zinc-400 mt-1">将永久清除 PocketBase 数据库中所有愿景、里程碑、任务和复盘记录。</p>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setClearModalOpen(false)} className="btn-ghost">取消</button>
            <button onClick={handleClearData} disabled={clearing} className="btn-danger">
              {clearing ? '清除中...' : '确认清空'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
