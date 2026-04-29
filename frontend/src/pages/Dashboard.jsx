import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Flame, Star, BookOpen, Bot, Activity, Trophy } from 'lucide-react'
import Sidebar from '../components/Sidebar.jsx'
import Navbar from '../components/Navbar.jsx'
import ActivityHeatmap from '../components/ActivityHeatmap.jsx'
import StreakBadge from '../components/StreakBadge.jsx'
import api from '../api/axios.js'
import { useAuth } from '../context/AuthContext.jsx'
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts'

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function Dashboard() {
  const { user } = useAuth()
  const [summary, setSummary] = useState(null)
  const [heatmap, setHeatmap] = useState([])

  useEffect(() => {
    api.get('/api/progress/summary').then((r) => setSummary(r.data)).catch(() => {})
    api.get('/api/progress/heatmap').then((r) => setHeatmap(r.data)).catch(() => {})
  }, [])

  const streak = summary?.streak ?? user?.streak ?? 0
  const longestStreak = summary?.longest_streak ?? user?.longest_streak ?? 0
  const avgScore = summary?.avg_score ?? 0
  const bestScore = summary?.best_score ?? 0
  const totalQuizzes = summary?.total_quizzes ?? 0
  const achievements = summary?.achievements ?? user?.achievements ?? []

  // Radar chart data from topic_performance
  const radarData = summary?.topic_performance
    ? Object.entries(summary.topic_performance).slice(0, 6).map(([topic, val]) => ({
        subject: topic.length > 10 ? topic.substring(0, 10) + '…' : topic,
        value: val,
      }))
    : []

  // Weekly activity for line chart
  const weeklyData = summary?.weekly_activity?.map(({ date, quizzes_taken }) => ({
    day: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
    quizzes: quizzes_taken,
  })) ?? []

  return (
    <div className="flex h-screen bg-cream overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-6">

          {/* Greeting */}
          <div className="mb-6">
            <h1 className="font-serif text-3xl font-bold text-gray-800">
              {getGreeting()}, {user?.name?.split(' ')[0]}
            </h1>
            <p className="text-gray-500 text-sm mt-1">Let's keep the learning momentum going today!</p>
          </div>

          {/* Top stats row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Streak */}
            <div className="bg-white rounded-2xl p-5 shadow-card">
              <div className="flex items-center gap-2 mb-3">
                <Flame size={18} className="text-orange-500" />
                <span className="text-sm font-semibold text-gray-600">Study Streak</span>
              </div>
              <p className="font-serif text-2xl font-bold text-gray-800 mb-2">{streak} Day Streak</p>
              <div className="flex gap-1 mb-2">
                {[...Array(Math.min(streak, 7))].map((_, i) => (
                  <div key={i} className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center text-white text-xs font-bold">
                    {i + 1}
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400">Goal: {longestStreak} Days</p>
            </div>

            {/* Weekly progress */}
            <div className="bg-white rounded-2xl p-5 shadow-card">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Activity size={18} className="text-primary" />
                  <span className="text-sm font-semibold text-gray-600">Weekly Activity</span>
                </div>
                <span className="text-xs text-green-600 font-medium">↑ {totalQuizzes} total</span>
              </div>
              <ResponsiveContainer width="100%" height={80}>
                <LineChart data={weeklyData} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
                  <Line type="monotone" dataKey="quizzes" stroke="#4a6741" strokeWidth={2} dot={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 9, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* XP / Score */}
            <div className="bg-white rounded-2xl p-5 shadow-card">
              <div className="flex items-center gap-2 mb-3">
                <Star size={18} className="text-yellow-500 fill-yellow-500" />
                <span className="text-sm font-semibold text-gray-600">Performance</span>
              </div>
              <p className="font-serif text-2xl font-bold text-gray-800">{avgScore}%</p>
              <p className="text-xs text-gray-400 mt-1">Avg Score</p>
              <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: `${avgScore}%` }} />
              </div>
              <p className="text-xs text-primary mt-1 font-medium">Best: {bestScore}%</p>
            </div>

            {/* Subject mastery */}
            <div className="bg-white rounded-2xl p-5 shadow-card">
              <div className="flex items-center gap-2 mb-3">
                <BookOpen size={18} className="text-primary" />
                <span className="text-sm font-semibold text-gray-600">Total Quizzes</span>
              </div>
              <p className="font-serif text-3xl font-bold text-gray-800">{totalQuizzes}</p>
              <p className="text-xs text-gray-400 mt-1">Quizzes completed</p>
              <Link to="/quiz" className="text-xs text-primary font-medium mt-2 block hover:underline">Take a quiz →</Link>
            </div>
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            {/* Knowledge Radar */}
            <div className="bg-white rounded-2xl p-5 shadow-card">
              <h3 className="font-semibold text-gray-700 mb-4">Knowledge Radar</h3>
              {radarData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#e5e7eb" />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: '#6b7280' }} />
                    <Radar dataKey="value" stroke="#4a6741" fill="#4a6741" fillOpacity={0.25} strokeWidth={2} />
                    <Tooltip formatter={(v) => `${v}%`} />
                  </RadarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
                  Complete quizzes to see your knowledge radar
                </div>
              )}
            </div>

            {/* Activity Heatmap */}
            <div className="bg-white rounded-2xl p-5 shadow-card">
              <h3 className="font-semibold text-gray-700 mb-4">Activity Heatmap</h3>
              <ActivityHeatmap data={heatmap} />
            </div>
          </div>

          {/* Achievements + Quick actions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Achievements */}
            <div className="bg-white rounded-2xl p-5 shadow-card">
              <div className="flex items-center gap-2 mb-4">
                <Trophy size={18} className="text-yellow-500" />
                <h3 className="font-semibold text-gray-700">Recent Badges</h3>
              </div>
              {achievements.length > 0 ? (
                <div className="flex flex-wrap gap-3">
                  {achievements.map((a) => <StreakBadge key={a} label={a} />)}
                </div>
              ) : (
                <p className="text-sm text-gray-400">Complete quizzes to earn badges!</p>
              )}
            </div>

            {/* Quick actions */}
            <div className="bg-white rounded-2xl p-5 shadow-card">
              <h3 className="font-semibold text-gray-700 mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <Link to="/quiz" className="flex items-center gap-3 p-3 rounded-xl hover:bg-cream transition-colors">
                  <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                    <BookOpen size={16} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Take a Quiz</p>
                    <p className="text-xs text-gray-400">Generate from your materials</p>
                  </div>
                </Link>
                <Link to="/resources" className="flex items-center gap-3 p-3 rounded-xl hover:bg-cream transition-colors">
                  <div className="w-8 h-8 bg-accent/20 rounded-lg flex items-center justify-center">
                    <BookOpen size={16} className="text-secondary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Upload Material</p>
                    <p className="text-xs text-gray-400">Add PDFs to your library</p>
                  </div>
                </Link>
                <Link to="/chat" className="flex items-center gap-3 p-3 rounded-xl hover:bg-cream transition-colors">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <Bot size={16} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Ask AI Tutor</p>
                    <p className="text-xs text-gray-400">Get help with any topic</p>
                  </div>
                </Link>
              </div>
            </div>
          </div>

        </main>
      </div>
    </div>
  )
}
