function localDateStr(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export default function ActivityHeatmap({ data }) {
  const dayMap = {}
  if (data && data.length > 0) {
    data.forEach(({ date, quizzes_taken }) => {
      dayMap[date] = quizzes_taken
    })
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = localDateStr(today)
  const msPerDay = 86400000

  const startOffset = 364 + today.getDay()
  const gridStart = new Date(today.getTime() - startOffset * msPerDay)

  const weeks = []
  for (let w = 0; w < 53; w++) {
    const week = []
    for (let d = 0; d < 7; d++) {
      const cell = new Date(gridStart.getTime() + (w * 7 + d) * msPerDay)
      if (cell > today) {
        week.push(null)
      } else {
        const dateStr = localDateStr(cell)
        week.push({
          dateStr,
          label: cell.toDateString(),
          count: dayMap[dateStr] || 0,
          isToday: dateStr === todayStr,
        })
      }
    }
    weeks.push(week)
  }

  const getColor = (count, isToday) => {
    if (isToday && count === 0) return 'bg-blue-200'
    if (count === 0) return 'bg-gray-200'
    if (count <= 2) return 'bg-green-300'
    if (count <= 4) return 'bg-green-500'
    if (count <= 6) return 'bg-green-600'
    return 'bg-green-800'
  }

  const totalActivity = Object.values(dayMap).reduce((a, b) => a + b, 0)

  return (
    <div>
      {totalActivity > 0 && (
        <p className="text-xs text-gray-500 mb-3">{totalActivity} quizzes in the last year</p>
      )}
      <div className="overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-1">
              {week.map((cell, di) =>
                !cell ? (
                  <div key={di} className="w-3 h-3" />
                ) : (
                  <div
                    key={di}
                    className={`w-3 h-3 rounded-sm ${getColor(cell.count, cell.isToday)} hover:ring-1 hover:ring-primary cursor-pointer`}
                    title={`${cell.label}: ${cell.count} quiz${cell.count !== 1 ? 'zes' : ''}`}
                  />
                )
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2 mt-3 text-xs text-gray-500">
        <span>Less</span>
        <div className="flex gap-1">
          {['bg-gray-200', 'bg-green-300', 'bg-green-500', 'bg-green-600', 'bg-green-800'].map((c) => (
            <div key={c} className={`w-3 h-3 rounded-sm ${c}`} />
          ))}
        </div>
        <span>More</span>
      </div>
    </div>
  )
}
