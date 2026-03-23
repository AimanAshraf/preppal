import { useState, useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import { Send, Bot, User, FileText } from 'lucide-react'
import Sidebar from '../components/Sidebar.jsx'
import Navbar from '../components/Navbar.jsx'
import api from '../api/axios.js'

export default function Chat() {
  const [materials, setMaterials] = useState([])
  const [selectedMaterial, setSelectedMaterial] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef()

  useEffect(() => {
    api.get('/api/materials').then((res) => setMaterials(res.data)).catch(() => {})
  }, [])

  useEffect(() => {
    if (selectedMaterial) {
      api.get(`/api/chat/history/${selectedMaterial}`).then((res) => {
        setMessages(res.data.map((m) => ({ role: m.role, content: m.content })))
      }).catch(() => setMessages([]))
    }
  }, [selectedMaterial])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (e) => {
    e.preventDefault()
    if (!input.trim() || !selectedMaterial) return

    const userMsg = { role: 'user', content: input }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setSending(true)

    try {
      const res = await api.post('/api/chat/message', {
        message: userMsg.content,
        material_id: selectedMaterial,
        conversation_history: messages.slice(-10),
      })
      setMessages((prev) => [...prev, { role: 'assistant', content: res.data.response }])
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to get response')
      setMessages((prev) => prev.slice(0, -1))
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar title="AI Tutor Chat" />
        <div className="p-4 border-b bg-white">
          <select
            value={selectedMaterial || ''}
            onChange={(e) => setSelectedMaterial(e.target.value || null)}
            className="w-full max-w-sm border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Select a study material to chat about...</option>
            {materials.map((m) => (
              <option key={m.id} value={m.id}>{m.filename}</option>
            ))}
          </select>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!selectedMaterial ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <FileText size={48} className="mb-3 opacity-40" />
              <p>Select a study material above to start chatting</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <Bot size={48} className="mb-3 opacity-40" />
              <p>Ask me anything about your study material!</p>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="p-2 bg-primary rounded-full h-8 w-8 flex items-center justify-center flex-shrink-0">
                    <Bot size={16} className="text-white" />
                  </div>
                )}
                <div
                  className={`max-w-xl rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-primary text-white rounded-tr-sm'
                      : 'bg-white shadow-sm text-gray-800 rounded-tl-sm'
                  }`}
                >
                  {msg.content}
                </div>
                {msg.role === 'user' && (
                  <div className="p-2 bg-gray-200 rounded-full h-8 w-8 flex items-center justify-center flex-shrink-0">
                    <User size={16} className="text-gray-600" />
                  </div>
                )}
              </div>
            ))
          )}
          {sending && (
            <div className="flex gap-3 justify-start">
              <div className="p-2 bg-primary rounded-full h-8 w-8 flex items-center justify-center">
                <Bot size={16} className="text-white" />
              </div>
              <div className="bg-white shadow-sm rounded-2xl px-4 py-3 text-gray-500 text-sm">
                Thinking...
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <form onSubmit={sendMessage} className="p-4 bg-white border-t flex gap-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={selectedMaterial ? 'Ask a question about your material...' : 'Select a material first'}
            disabled={!selectedMaterial || sending}
            className="flex-1 border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-50"
          />
          <button
            type="submit"
            disabled={!selectedMaterial || !input.trim() || sending}
            className="bg-primary text-white rounded-xl px-4 py-2.5 hover:bg-indigo-600 transition-colors disabled:opacity-50"
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  )
}
