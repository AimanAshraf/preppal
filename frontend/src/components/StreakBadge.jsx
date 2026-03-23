import { Award } from 'lucide-react'

export default function StreakBadge({ label }) {
  const colors = {
    'First Quiz': 'bg-blue-100 text-blue-800 border-blue-300',
    'Perfect Score': 'bg-yellow-100 text-yellow-800 border-yellow-300',
    '7-Day Streak': 'bg-orange-100 text-orange-800 border-orange-300',
    '30-Day Streak': 'bg-red-100 text-red-800 border-red-300',
    'Quiz Master': 'bg-purple-100 text-purple-800 border-purple-300',
  }

  const colorClass = colors[label] || 'bg-gray-100 text-gray-800 border-gray-300'

  return (
    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border ${colorClass}`}>
      <Award size={18} />
      <span className="font-semibold">{label}</span>
    </div>
  )
}
