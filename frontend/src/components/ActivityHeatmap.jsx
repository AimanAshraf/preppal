export default function ActivityHeatmap({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-400">
        <p>No activity data yet. Start taking quizzes!</p>
      </div>
    )
  }

  // Group data by week
  const weeks = []
  const dayMap = {}

  data.forEach(({ date, quizzes_taken }) => {
    dayMap[date] = quizzes_taken
  })

  // Create 12-month grid
  const today = new Date()
  const startDate = new Date(today)
  startDate.setFullYear(today.getFullYear() - 1)

  for (let i = 0; i < 365; i++) {
    const date = new Date(startDate)
    date.setDate(startDate.getDate() + i)
    const dateStr = date.toISOString().split('T')[0]
    const weekNum = Math.floor(i / 7)
    const dayNum = i % 7

    if (!weeks[weekNum]) weeks[weekNum] = []
    weeks[weekNum][dayNum] = dayMap[dateStr] || 0
  }

  const getColor = (count) => {
    if (count === 0) return 'bg-gray-100'
    if (count === 1) return 'bg-green-200'
    if (count <= 2) return 'bg-green-400'
    if (count <= 3) return 'bg-green-600'
    return 'bg-green-800'
  }

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-0.5 flex-wrap">
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="flex flex-col gap-0.5">
            {[0, 1, 2, 3, 4, 5, 6].map((dayIndex) => {
              const count = week[dayIndex] || 0
              return (
                <div
                  key={dayIndex}
                  className={`w-4 h-4 rounded-sm ${getColor(count)} hover:ring-1 hover:ring-primary cursor-pointer transition-all`}
                  title={`${new Date(startDate.getTime() + (weekIndex * 7 + dayIndex) * 24 * 60 * 60 * 1000).toDateString()}: ${count} quiz${count !== 1 ? 'zes' : ''}`}
                />
              )
            })}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 mt-4 text-xs text-gray-500">
        <span>Less</span>
        <div className="flex gap-0.5">
          <div className="w-3 h-3 rounded-sm bg-gray-100"></div>
          <div className="w-3 h-3 rounded-sm bg-green-200"></div>
          <div className="w-3 h-3 rounded-sm bg-green-400"></div>
          <div className="w-3 h-3 rounded-sm bg-green-600"></div>
          <div className="w-3 h-3 rounded-sm bg-green-800"></div>
        </div>
        <span>More</span>
      </div>
    </div>
  )
}
