export default function QuestionCard({ question, answer, onAnswer }) {
  const selectedOption = answer || ''

  return (
    <div className="bg-white rounded-2xl shadow-card p-6 space-y-5">
      <div>
        <span className="text-xs font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full">
          {question.type === 'mcq' && 'Multiple Choice'}
          {question.type === 'truefalse' && 'True / False'}
          {question.type === 'fillblank' && 'Fill in the Blank'}
        </span>
        <h2 className="text-lg font-bold text-gray-800 mt-3 leading-snug">{question.question}</h2>
      </div>

      {question.type === 'mcq' && (
        <div className="space-y-2.5">
          {question.options?.map((option, i) => {
            const letter = String.fromCharCode(65 + i)
            const isSelected = selectedOption === option
            return (
              <button key={option} onClick={() => onAnswer(option)}
                className={`w-full flex items-center gap-3 p-3.5 border-2 rounded-xl text-left text-sm font-medium transition-all ${
                  isSelected
                    ? 'border-primary bg-primary/5 text-primary-dark'
                    : 'border-gray-200 text-gray-700 hover:border-primary/50 hover:bg-cream'
                }`}>
                <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                  isSelected ? 'bg-primary text-white' : 'bg-cream-dark text-gray-600'
                }`}>{letter}</span>
                {option.replace(/^[A-D]\.\s*/, '')}
              </button>
            )
          })}
        </div>
      )}

      {question.type === 'truefalse' && (
        <div className="grid grid-cols-2 gap-3">
          {['True', 'False'].map((option) => (
            <button key={option} onClick={() => onAnswer(option)}
              className={`p-4 border-2 rounded-xl font-bold text-sm transition-all ${
                selectedOption === option
                  ? 'border-primary bg-primary text-white'
                  : 'border-gray-200 text-gray-700 hover:border-primary/50 hover:bg-cream'
              }`}>
              {option}
            </button>
          ))}
        </div>
      )}

      {question.type === 'fillblank' && (
        <input type="text" value={selectedOption} onChange={(e) => onAnswer(e.target.value)}
          placeholder="Type your answer here..."
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary text-sm" />
      )}
    </div>
  )
}
