import { Link, useLocation } from 'react-router-dom'
import { BookOpen, Brain, MessageSquare, BarChart3, Settings } from 'lucide-react'

const navItems = [
  { path: '/dashboard', icon: BarChart3, label: 'Dashboard' },
  { path: '/resources', icon: BookOpen, label: 'Resources' },
  { path: '/quiz', icon: Brain, label: 'Quizzes' },
  { path: '/chat', icon: MessageSquare, label: 'Chat' },
  { path: '/settings', icon: Settings, label: 'Settings' },
]

export default function Sidebar() {
  const { pathname } = useLocation()

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-primary rounded-lg">
            <Brain size={24} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-800">PrepPal</h1>
        </div>
      </div>

      <nav className="flex-1 py-6 px-3 space-y-2">
        {navItems.map(({ path, icon: Icon, label }) => (
          <Link
            key={path}
            to={path}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              pathname === path
                ? 'bg-primary text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Icon size={20} />
            <span className="font-medium">{label}</span>
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-200 text-xs text-gray-500 text-center">
        <p>PrepPal v1.0</p>
      </div>
    </aside>
  )
}
