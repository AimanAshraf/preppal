import { useParams, useNavigate } from 'react-router-dom'
import { CheckCircle, XCircle, Award } from 'lucide-react'
import StreakBadge from '../components/StreakBadge.jsx'

export default function QuizResult() {
  const { quizId } = useParams()
  const navigate = useNavigate()

  const result = JSON.parse(sessionStorage.getItem(`result_${quizId}`) || '{}')
  const { score, total, percentage, correct_answers, explanations, weak_topics, new_achievements, questions } = result

  if (!score !== undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600 mb-4">No results found</p>
          <button
            onClick={() => navigate('/quiz')}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-indigo-600"
          >
            Back to Quiz Hub
          </button>
        </div>
      </div>
    )
  }

  const isPassed = percentage >= 70

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-violet-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Score Card */}
        <div className={`rounded-2xl shadow-lg p-8 mb-8 text-center text-white ${isPassed ? 'bg-gradient-to-r from-green-500 to-green-600' : 'bg-gradient-to-r from-orange-500 to-orange-600'}`}>
          <div className="flex items-center justify-center mb-4">
            {isPassed ? (
              <CheckCircle size={64} />
            ) : (
              <XCircle size={64} />
            )}
          </div>
          <h1 className="text-4xl font-bold mb-2">{percentage}%</h1>
          <p className="text-lg mb-2">{score} out of {total} correct</p>
          <p className="text-sm opacity-90">
            {isPassed ? 'Great job! You passed!' : 'Keep practicing to improve!'}
          </p>
        </div>

        {/* Achievements */}
        {new_achievements && new_achievements.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Award className="text-yellow-500" size={24} />
              <h2 className="text-xl font-bold text-gray-800">New Achievements!</h2>
            </div>
            <div className="flex flex-wrap gap-3">
              {new_achievements.map((achievement) => (
                <StreakBadge key={achievement} label={achievement} />
              ))}
            </div>
          </div>
        )}

        {/* Detailed Results */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <p className="text-gray-600 text-sm">Correct Answers</p>
            <p className="text-4xl font-bold text-green-600">{score}</p>
            <p className="text-gray-500 text-xs mt-1">out of {total}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <p className="text-gray-600 text-sm">Accuracy</p>
            <p className="text-4xl font-bold text-primary">{percentage}%</p>
            <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <p className="text-gray-600 text-sm">Weak Topics</p>
            <div className="mt-2 space-y-1">
              {weak_topics && weak_topics.length > 0 ? (
                weak_topics.map((topic) => (
                  <p key={topic} className="text-sm text-orange-600 font-medium">
                    • {topic}
                  </p>
                ))
              ) : (
                <p className="text-sm text-green-600">No weak topics!</p>
              )}
            </div>
          </div>
        </div>

        {/* Question Breakdown */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-6">Question Review</h2>
          <div className="space-y-4">
            {questions && questions.map((question, index) => {
              const isCorrect = question.correct_answer === correct_answers[index]
              return (
                <div
                  key={index}
                  className={`p-4 rounded-lg border-2 ${
                    isCorrect
                      ? 'border-green-300 bg-green-50'
                      : 'border-red-300 bg-red-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-800">
                        Question {index + 1}: {question.question}
                      </p>
                      <p className="text-sm text-gray-600 mt-2">
                        <span className="font-medium">Your answer:</span> {correct_answers[index]}
                      </p>
                      {!isCorrect && (
                        <p className="text-sm text-green-700 mt-1 font-medium">
                          <span>Correct answer:</span> {question.correct_answer}
                        </p>
                      )}
                      <p className="text-sm text-gray-600 mt-2">
                        <span className="font-medium">Explanation:</span> {explanations[index]}
                      </p>
                    </div>
                    <div>
                      {isCorrect ? (
                        <CheckCircle className="text-green-600" size={24} />
                      ) : (
                        <XCircle className="text-red-600" size={24} />
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => navigate('/quiz')}
            className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-indigo-600 transition-colors"
          >
            Take Another Quiz
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}
