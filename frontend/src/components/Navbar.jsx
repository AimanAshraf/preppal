import { Bell, ChevronDown, X, User, Settings, LogOut } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios.js'

const TYPE_STYLES = {
  achievement: 'bg-yellow-50 border-yellow-200',
  reminder:    'bg-blue-50 border-blue-200',
  tip:         'bg-green-50 border-green-200',
}

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const initials = user?.name?.charAt(0)?.toUpperCase() || '?'

  const [notifOpen, setNotifOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [loadingNotif, setLoadingNotif] = useState(false)
  const [unread, setUnread] = useState(0)

  const notifRef = useRef()
  const profileRef = useRef()

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false)
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Fetch notifications when panel opens
  useEffect(() => {
    if (!notifOpen) return
    setLoadingNotif(true)
    api.get('/api/progress/notifications')
      .then((res) => { setNotifications(res.data); setUnread(0) })
      .catch(() => {})
      .finally(() => setLoadingNotif(false))
  }, [notifOpen])

  // Unread dot on mount
  useEffect(() => {
    api.get('/api/progress/notifications')
      .then((res) => setUnread(res.data.length))
      .catch(() => {})
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/signin')
  }

  return (
    <header className="bg-white border-b border-cream-dark px-6 py-3 flex items-center justify-end gap-3 shrink-0 relative z-40">

      {/* Bell */}
      <div ref={notifRef} className="relative">
        <button onClick={() => { setNotifOpen((o) => !o); setProfileOpen(false) }}
          className="p-2 rounded-xl hover:bg-cream transition-colors relative">
          <Bell size={18} className="text-gray-500" />
          {unread > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />}
        </button>

        {notifOpen && (
          <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800 text-sm">Notifications</h3>
              <button onClick={() => setNotifOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {loadingNotif ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">
                  <Bell size={28} className="mx-auto mb-2 opacity-30" />
                  No notifications
                </div>
              ) : (
                <div className="p-2 space-y-2">
                  {notifications.map((n, i) => (
                    <div key={i} className={`flex gap-3 p-3 rounded-xl border text-sm ${TYPE_STYLES[n.type] || 'bg-gray-50 border-gray-200'}`}>
                      <span className="text-xl shrink-0 mt-0.5">{n.icon}</span>
                      <div>
                        <p className="font-semibold text-gray-800">{n.title}</p>
                        <p className="text-gray-600 text-xs mt-0.5 leading-relaxed">{n.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Avatar + name → profile dropdown */}
      <div ref={profileRef} className="relative">
        <button onClick={() => { setProfileOpen((o) => !o); setNotifOpen(false) }}
          className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-cream transition-colors">
          {user?.avatar_url ? (
            <img src={`http://127.0.0.1:8000${user.avatar_url}`} alt="avatar"
              className="w-8 h-8 rounded-full object-cover" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-sm">
              {initials}
            </div>
          )}
          <span className="text-sm font-medium text-gray-700">{user?.name?.split(' ')[0]}</span>
          <ChevronDown size={14} className={`text-gray-400 transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
        </button>

        {profileOpen && (
          <div className="absolute right-0 top-12 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            {/* Profile header */}
            <div className="px-4 py-4 border-b border-gray-100 flex items-center gap-3">
              {user?.avatar_url ? (
                <img src={`http://127.0.0.1:8000${user.avatar_url}`} alt="avatar"
                  className="w-12 h-12 rounded-full object-cover shrink-0" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-lg shrink-0">
                  {initials}
                </div>
              )}
              <div className="min-w-0">
                <p className="font-semibold text-gray-800 text-sm truncate">{user?.name}</p>
                <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                {user?.bio && <p className="text-xs text-gray-500 mt-0.5 truncate">{user.bio}</p>}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-px bg-gray-100 border-b border-gray-100">
              <div className="bg-white px-4 py-3 text-center">
                <p className="text-lg font-bold text-primary">{user?.streak ?? 0}</p>
                <p className="text-xs text-gray-400">day streak</p>
              </div>
              <div className="bg-white px-4 py-3 text-center">
                <p className="text-lg font-bold text-primary">{user?.achievements?.length ?? 0}</p>
                <p className="text-xs text-gray-400">badges</p>
              </div>
            </div>

            {/* Actions */}
            <div className="p-2">
              <button onClick={() => { setProfileOpen(false); navigate('/settings') }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-700 hover:bg-cream transition-colors">
                <Settings size={15} className="text-gray-400" />
                Settings
              </button>
              <button onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-500 hover:bg-red-50 transition-colors">
                <LogOut size={15} />
                Sign out
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
