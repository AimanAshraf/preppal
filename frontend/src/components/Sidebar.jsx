import { Link, useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, BookOpen, Library, Bot, Settings, LogOut, Leaf } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'

const navItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/quiz', icon: BookOpen, label: 'Quizzes' },
  { path: '/resources', icon: Library, label: 'Resources' },
  { path: '/chat', icon: Bot, label: 'AI Tutor' },
]

export default function Sidebar() {
  const { pathname } = useLocation()
  const { logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => { logout(); navigate('/signin') }

  return (
    <aside className="w-56 bg-sidebar-bg border-r border-cream-dark flex flex-col shrink-0 h-screen">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-cream-dark">
        <Link to="/dashboard" className="flex items-center gap-2">
          <Leaf size={22} className="text-primary" />
          <span className="font-serif text-xl font-bold text-primary-dark">Preppal</span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 space-y-1">
        {navItems.map(({ path, icon: Icon, label }) => {
          const active = pathname === path || pathname.startsWith(path + '/')
          return (
            <Link
              key={path}
              to={path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                active
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-gray-600 hover:bg-cream-dark hover:text-primary-dark'
              }`}
            >
              <Icon size={18} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 pb-4 space-y-1 border-t border-cream-dark pt-3">
        <Link
          to="/settings"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
            pathname === '/settings'
              ? 'bg-primary text-white'
              : 'text-gray-600 hover:bg-cream-dark hover:text-primary-dark'
          }`}
        >
          <Settings size={18} />
          settings
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-cream-dark hover:text-red-600 transition-all"
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </aside>
  )
}
