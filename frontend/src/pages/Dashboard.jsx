import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Brain, MessageSquare, TrendingUp, Flame, Award } from 'lucide-react'
import Sidebar from '../components/Sidebar.jsx'
import Navbar from '../components/Navbar.jsx'
import ProgressChart from '../components/ProgressChart.jsx'
import ActivityHeatmap from '../components/ActivityHeatmap.jsx'
import StreakBadge from '../components/StreakBadge.jsx'
import api from '../api/axios.js'
import { useAuth } from '../context/AuthContext.jsx'

export default function Dashboard() {
  const { user } = useAuth()
  const [summary, setSummary] = useState(null)
  const [heatmap, setHeatmap] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [summaryRes, heatmapRes] = await Promise.all([
          api.get('/api/progress/summary'),
          api.get('/api/progress/heatmap'),
        ])
        setSummary(summaryRes.data)
        setHeatmap(heatmapRes.data)
      } catch {
        // Fail silently, show empty state
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar title="Dashboard" />
        <main className="flex-1 overflow-y-auto p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">
            Welcome back, {user?.name}! 👋
          </h2>

          {/* Stats cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard icon={<Brain className="text-primary" />} label="Total Quizzes" value={summary?.total_quizzes ?? 0} />
            <StatCard icon={<TrendingUp className="text-green-500" />} label="Avg Score" value={`${summary?.avg_score ?? 0}%`} />
            <StatCard icon={<Flame className="text-orange-500" />} label="Current Streak" value={`${summary?.streak ?? 0} days`} />
            <StatCard icon={<Award className="text-yellow-500" />} label="Achievements" value={summary?.achievements?.length ?? 0} />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-700 mb-4">Topic Performance</h3>
              <ProgressChart data={summary?.topic_performance} />
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-700 mb-4">Weekly Activity</h3>
              <ProgressChart data={summary?.weekly_activity} type="weekly" />
            </div>
          </div>

          {/* Heatmap */}
          <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Activity Heatmap</h3>
            <ActivityHeatmap data={heatmap} />
          </div>

          {/* Achievements */}
          {summary?.achievements?.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
              <h3 className="text-lg font-semibold text-gray-700 mb-4">Achievements</h3>
              <div className="flex flex-wrap gap-3">
                {summary.achievements.map((a) => (
                  <StreakBadge key={a} label={a} />
                ))}
              </div>
            </div>
          )}

          {/* Quick actions */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <QuickAction to="/resources" icon={<BookOpen />} label="Upload Materials" color="bg-primary" />
            <QuickAction to="/quiz" icon={<Brain />} label="Take a Quiz" color="bg-secondary" />
            <QuickAction to="/chat" icon={<MessageSquare />} label="Chat with AI" color="bg-accent" />
          </div>
        </main>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-5 flex items-center gap-4">
      <div className="p-3 bg-gray-50 rounded-lg">{icon}</div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
      </div>
    </div>
  )
}

function QuickAction({ to, icon, label, color }) {
  return (
    <Link
      to={to}
      className={`${color} text-white rounded-xl p-5 flex items-center gap-3 hover:opacity-90 transition-opacity`}
    >
      {icon}
      <span className="font-semibold">{label}</span>
    </Link>
  )
}
