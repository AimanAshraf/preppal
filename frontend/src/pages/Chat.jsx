import { useState, useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import { Send, Bot, User, FileText, Trash2 } from 'lucide-react'
import Sidebar from '../components/Sidebar.jsx'
import Navbar from '../components/Navbar.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import api from '../api/axios.js'
import { useLocation } from 'react-router-dom'

const QUICK_PROMPTS = ['Explain this topic', 'Practice problems', 'Study plan']

// Simple markdown renderer — handles bold, headers, bullets, code
function MarkdownText({ content }) {
  const lines = (content || '').split('\n')
  return (
    <div className="space-y-1 leading-relaxed">
      {lines.map((line, i) => {
        if (/^### (.+)/.test(line)) return <p key={i} className="font-semibold text-gray-800 mt-2">{line.replace(/^### /, '')}</p>
        if (/^## (.+)/.test(line)) return <p key={i} className="font-bold text-gray-800 text-base mt-2">{line.replace(/^## /, '')}</p>
        if (/^# (.+)/.test(line)) return <p key={i} className="font-bold text-gray-800 text-lg mt-2">{line.replace(/^# /, '')}</p>
        if (/^\* (.+)/.test(line) || /^- (.+)/.test(line)) {
          return <div key={i} className="flex gap-2"><span className="text-primary mt-0.5">•</span><span>{renderInline(line.replace(/^[\*\-] /, ''))}</span></div>
        }
        if (/^\d+\. (.+)/.test(line)) {
          const num = line.match(/^(\d+)\./)[1]
          return <div key={i} className="flex gap-2"><span className="text-primary font-medium shrink-0">{num}.</span><span>{renderInline(line.replace(/^\d+\. /, ''))}</span></div>
        }
        if (line.trim() === '') return <div key={i} className="h-1" />
        return <p key={i}>{renderInline(line)}</p>
      })}
    </div>
  )
}

function renderInline(text) {
  // Bold **text** and *italic*
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/)
  return parts.map((part, i) => {
    if (/^\*\*(.+)\*\*$/.test(part)) return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>
    if (/^\*(.+)\*$/.test(part)) return <em key={i}>{part.slice(1, -1)}</em>
    if (/^`(.+)`$/.test(part)) return <code key={i} className="bg-cream px-1 rounded text-xs font-mono text-primary-dark">{part.slice(1, -1)}</code>
    return part
  })
}

export default function Chat() {
  const [materials, setMaterials] = useState([])
  const [selectedMaterial, setSelectedMaterial] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const bottomRef = useRef()
  const location = useLocation()
  const didAutoSend = useRef(false)

  useEffect(() => {
    api.get('/api/materials').then((res) => {
      setMaterials(res.data)
      // Pre-select material if navigated from quiz result
      if (location.state?.material_id) {
        setSelectedMaterial(location.state.material_id)
      }
    }).catch(() => {})
  }, [])

  // Auto-send prefill message once material + history are loaded
  useEffect(() => {
    if (location.state?.prefill && selectedMaterial && !didAutoSend.current) {
      didAutoSend.current = true
      setInput(location.state.prefill)
    }
  }, [selectedMaterial])

  useEffect(() => {
    if (selectedMaterial) {
      setMessages([])
      api.get(`/api/chat/history/${selectedMaterial}`)
        .then((res) => setMessages(res.data.map((m) => ({ role: m.role, content: m.content }))))
        .catch(() => setMessages([]))
    }
  }, [selectedMaterial])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const clearHistory = async () => {
    setShowClearConfirm(false)
    const toastId = toast.loading('Clearing chat history...')
    try {
      await api.delete(`/api/chat/history/${selectedMaterial}`)
      setMessages([])
      toast.success('Chat history cleared', { id: toastId })
    } catch {
      toast.error('Failed to clear history', { id: toastId })
    }
  }

  const sendMessage = async (text) => {
    const msg = text || input.trim()
    if (!msg || !selectedMaterial) return
    const userMsg = { role: 'user', content: msg }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setSending(true)
    try {
      const res = await api.post('/api/chat/message', {
        message: msg,
        material_id: selectedMaterial,
        conversation_history: messages.slice(-10),
      })
      setMessages((prev) => [...prev, { role: 'assistant', content: res.data.response }])
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to get response')
      setMessages((prev) => prev.slice(0, -1))
    } finally { setSending(false) }
  }

  const selectedMaterialName = materials.find((m) => m.id === selectedMaterial)?.filename

  return (
    <div className="flex h-screen bg-cream overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex overflow-hidden">
        {/* Main chat area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <Navbar />

          {/* Material selector */}
          <div className="bg-white border-b border-cream-dark px-6 py-3 flex items-center gap-3">
            <h1 className="font-serif text-xl font-bold text-gray-800">AI Tutor</h1>
            <div className="flex items-center gap-2 ml-4">
              <select
                value={selectedMaterial || ''}
                onChange={(e) => setSelectedMaterial(e.target.value || null)}
                className="border border-gray-200 rounded-xl px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="">Select material...</option>
                {materials.map((m) => <option key={m.id} value={m.id}>{m.filename}</option>)}
              </select>
              {selectedMaterial && messages.length > 0 && (
                <button onClick={() => setShowClearConfirm(true)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors" title="Clear history">
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          </div>

          {/* Quick prompts */}
          {selectedMaterial && messages.length === 0 && (
            <div className="px-6 py-3 flex gap-2 bg-white border-b border-cream-dark">
              {QUICK_PROMPTS.map((p) => (
                <button key={p} onClick={() => sendMessage(p)}
                  className="px-3 py-1.5 border border-gray-200 rounded-full text-xs font-medium text-gray-600 hover:border-primary hover:text-primary transition-colors">
                  {p}
                </button>
              ))}
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {!selectedMaterial ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <FileText size={48} className="mb-3 opacity-30" />
                <p className="text-sm">Select a study material to start chatting</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <Bot size={48} className="mb-3 opacity-30" />
                <p className="text-sm">Ask me anything about <span className="text-primary font-medium">{selectedMaterialName}</span></p>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center shrink-0">
                      <Bot size={14} className="text-white" />
                    </div>
                  )}
                  <div className={`max-w-lg rounded-2xl px-4 py-3 text-sm ${
                    msg.role === 'user'
                      ? 'bg-primary-dark text-white rounded-tr-sm'
                      : 'bg-white shadow-card text-gray-800 rounded-tl-sm'
                  }`}>
                    <MarkdownText content={msg.content || ''} />
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-8 h-8 bg-cream-dark rounded-full flex items-center justify-center shrink-0">
                      <User size={14} className="text-gray-600" />
                    </div>
                  )}
                </div>
              ))
            )}
            {sending && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                  <Bot size={14} className="text-white" />
                </div>
                <div className="bg-white shadow-card rounded-2xl px-4 py-3 text-gray-400 text-sm flex items-center gap-1">
                  <span className="animate-bounce">•</span>
                  <span className="animate-bounce" style={{ animationDelay: '0.1s' }}>•</span>
                  <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>•</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <form onSubmit={(e) => { e.preventDefault(); sendMessage() }} className="p-4 bg-white border-t border-cream-dark flex gap-3">
            <div className="flex-1 relative">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value.slice(0, 2000))}
                placeholder={selectedMaterial ? 'Ask me anything...' : 'Select a material first'}
                disabled={!selectedMaterial || sending}
                className="w-full border border-gray-200 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:bg-gray-50 bg-cream"
              />
              {input.length > 1800 && (
                <span className="absolute right-3 bottom-2 text-xs text-orange-500">{input.length}/2000</span>
              )}
            </div>
            <button type="submit" disabled={!selectedMaterial || !input.trim() || sending}
              className="w-10 h-10 bg-primary-dark hover:bg-primary text-white rounded-full flex items-center justify-center transition-colors disabled:opacity-50 shrink-0">
              <Send size={16} />
            </button>
          </form>
        </div>
      </div>

      <ConfirmDialog
        open={showClearConfirm}
        title="Clear Chat History"
        message="All messages for this material will be permanently deleted. This cannot be undone."
        confirmLabel="Clear History"
        onConfirm={clearHistory}
        onCancel={() => setShowClearConfirm(false)}
      />
    </div>
  )
}
