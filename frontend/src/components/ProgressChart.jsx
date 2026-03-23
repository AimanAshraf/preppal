import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function ProgressChart({ data, type = 'topic' }) {
  if (!data || Object.keys(data).length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-center">
        <p>No data available yet. Complete some quizzes to see your progress!</p>
      </div>
    )
  }

  let chartData = []
  if (type === 'topic') {
    chartData = Object.entries(data).map(([name, value]) => ({
      name: name.substring(0, 15),
      value: parseFloat(value),
    }))
  } else if (type === 'weekly') {
    chartData = data.map(({ date, quizzes_taken }) => ({
      date: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
      value: quizzes_taken,
    }))
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      {type === 'topic' ? (
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="name" stroke="#6b7280" />
          <YAxis stroke="#6b7280" />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
            }}
          />
          <Bar dataKey="value" fill="#6366f1" radius={[8, 8, 0, 0]} />
        </BarChart>
      ) : (
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="date" stroke="#6b7280" />
          <YAxis stroke="#6b7280" />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
            }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#6366f1"
            strokeWidth={2}
            dot={{ fill: '#6366f1', r: 4 }}
          />
        </LineChart>
      )}
    </ResponsiveContainer>
  )
}
