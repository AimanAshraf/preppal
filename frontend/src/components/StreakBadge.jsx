import { Award, Flame, Star, Zap, Moon, Trophy, BookOpen, Target } from 'lucide-react'

const BADGES = {
  // Quiz count
  'First Quiz':       { style: 'bg-blue-100 text-blue-800 border-blue-200',     icon: BookOpen },
  'Quiz Enthusiast':  { style: 'bg-cyan-100 text-cyan-800 border-cyan-200',      icon: BookOpen },
  'Quiz Veteran':     { style: 'bg-indigo-100 text-indigo-800 border-indigo-200', icon: Trophy },
  'Quiz Master':      { style: 'bg-purple-100 text-purple-800 border-purple-200', icon: Trophy },
  'Quiz Legend':      { style: 'bg-pink-100 text-pink-800 border-pink-200',       icon: Trophy },
  // Score
  'Perfect Score':    { style: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Star },
  'High Achiever':    { style: 'bg-amber-100 text-amber-800 border-amber-200',    icon: Star },
  'Solid Performance':{ style: 'bg-lime-100 text-lime-800 border-lime-200',       icon: Target },
  // Streaks
  '3-Day Streak':     { style: 'bg-orange-100 text-orange-700 border-orange-200', icon: Flame },
  '7-Day Streak':     { style: 'bg-orange-100 text-orange-800 border-orange-300', icon: Flame },
  '14-Day Streak':    { style: 'bg-red-100 text-red-700 border-red-200',          icon: Flame },
  '30-Day Streak':    { style: 'bg-red-100 text-red-800 border-red-300',          icon: Flame },
  // Special
  'Night Owl':        { style: 'bg-slate-100 text-slate-800 border-slate-200',    icon: Moon },
  'Speed Runner':     { style: 'bg-green-100 text-green-800 border-green-200',    icon: Zap },
}

export default function StreakBadge({ label }) {
  const badge = BADGES[label]
  const Icon = badge?.icon || Award
  const style = badge?.style || 'bg-primary/10 text-primary border-primary/20'

  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold ${style}`}>
      <Icon size={13} />
      {label}
    </div>
  )
}
