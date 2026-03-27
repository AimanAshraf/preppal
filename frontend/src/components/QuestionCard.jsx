export default function QuestionCard({ question, answer, onAnswer }) {
  const selectedOption = answer || ''

  const handleChange = (value) => {
    onAnswer(value)
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-8 space-y-6">
      <div>
        <span className="text-sm font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full">
          {question.type === 'mcq' && 'Multiple Choice'}
          {question.type === 'truefalse' && 'True/False'}
          {question.type === 'fillblank' && 'Fill in the Blank'}
        </span>
        <h2 className="text-2xl font-bold text-gray-800 mt-4">{question.question}</h2>
      </div>

      {question.type === 'mcq' && (
        <div className="space-y-3">
          {question.options?.map((option) => (
            <button
              key={option}
              onClick={() => handleChange(option)}
              className={`w-full p-4 border-2 rounded-lg text-left font-medium transition-colors ${
                selectedOption === option
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-gray-300 text-gray-700 hover:border-primary'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      )}

      {question.type === 'truefalse' && (
        <div className="grid grid-cols-2 gap-4">
          {['True', 'False'].map((option) => (
            <button
              key={option}
              onClick={() => handleChange(option)}
              className={`p-4 border-2 rounded-lg font-bold transition-colors ${
                selectedOption === option
                  ? 'border-primary bg-primary text-white'
                  : 'border-gray-300 text-gray-700 hover:border-primary'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      )}

      {question.type === 'fillblank' && (
        <input
          type="text"
          value={selectedOption}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Type your answer here..."
          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 text-lg"
        />
      )}
    </div>
  )
}
