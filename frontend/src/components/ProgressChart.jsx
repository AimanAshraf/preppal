import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function ProgressChart({ data, type = 'topic' }) {
  const isEmpty = !data || (Array.isArray(data) ? data.length === 0 : Object.keys(data).length === 0)

  if (isEmpty) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-center">
        <p>No data yet. Complete some quizzes to see your progress!</p>
      </div>
    )
  }

  let chartData = []
  if (type === 'topic') {
    chartData = Object.entries(data).map(([name, value]) => ({
      name: name.length > 14 ? name.substring(0, 14) + '…' : name,
      fullName: name,
      value: parseFloat(value),
    }))
  } else if (type === 'weekly') {
    chartData = data.map(({ date, quizzes_taken }) => ({
      date: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
      value: quizzes_taken,
    }))
  }

  const TopicTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 shadow text-sm">
          <p className="font-medium text-gray-700">{payload[0].payload.fullName}</p>
          <p className="text-primary">{payload[0].value}% accuracy</p>
        </div>
      )
    }
    return null
  }

  const WeeklyTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 shadow text-sm">
          <p className="font-medium text-gray-700">{label}</p>
          <p className="text-primary">{payload[0].value} quiz{payload[0].value !== 1 ? 'zes' : ''}</p>
        </div>
      )
    }
    return null
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      {type === 'topic' ? (
        <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="name" stroke="#6b7280" tick={{ fontSize: 11 }} />
          <YAxis stroke="#6b7280" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
          <Tooltip content={<TopicTooltip />} />
          <Bar dataKey="value" fill="#6366f1" radius={[6, 6, 0, 0]} />
        </BarChart>
      ) : (
        <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="date" stroke="#6b7280" tick={{ fontSize: 11 }} />
          <YAxis stroke="#6b7280" allowDecimals={false} tick={{ fontSize: 11 }} />
          <Tooltip content={<WeeklyTooltip />} />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#6366f1"
            strokeWidth={2}
            dot={{ fill: '#6366f1', r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      )}
    </ResponsiveContainer>
  )
}
