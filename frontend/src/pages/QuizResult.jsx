import { useParams, useNavigate, Link } from 'react-router-dom'
import { CheckCircle, XCircle, Award, ChevronDown, ChevronUp, Bot, Leaf } from 'lucide-react'
import StreakBadge from '../components/StreakBadge.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useEffect, useState } from 'react'
import api from '../api/axios.js'

export default function QuizResult() {
  const { quizId } = useParams()
  const navigate = useNavigate()
  const { refreshUser } = useAuth()
  const [result, setResult] = useState(() => {
    const stored = sessionStorage.getItem(`result_${quizId}`)
    return stored ? JSON.parse(stored) : null
  })
  const [loading, setLoading] = useState(!result)
  const [expandedIdx, setExpandedIdx] = useState(null)

  const askAiExplain = (index, question, explanation, correctAnswer) => {
    // Navigate to chat with the question pre-loaded as a message
    const message = `Please explain in more detail why the correct answer to this question is "${correctAnswer}". Question: "${question.question}". The basic explanation given was: "${explanation}". Give a thorough, easy-to-understand explanation.`
    navigate('/chat', { state: { material_id: result.material_id, prefill: message } })
  }

  useEffect(() => {
    if (result) { refreshUser(); return }
    api.get(`/api/quiz/${quizId}/result`)
      .then((res) => { setResult(res.data); refreshUser() })
      .catch(() => navigate('/quiz'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
    </div>
  )

  if (!result || result.score === undefined) return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <div className="text-center">
        <p className="text-gray-600 mb-4">No results found</p>
        <button onClick={() => navigate('/quiz')} className="px-4 py-2 bg-primary text-white rounded-xl">Back to Quiz Hub</button>
      </div>
    </div>
  )

  const { score, total, percentage, correct_answers, explanations, weak_topics, new_achievements, questions, user_answers } = result
  const isPassed = percentage >= 70
  const circumference = 2 * Math.PI * 52
  const strokeOffset = circumference - (percentage / 100) * circumference

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <div className="bg-white border-b border-cream-dark px-6 py-3 flex items-center justify-between">
        <Link to="/quiz" className="text-sm text-gray-500 hover:text-primary flex items-center gap-1">
          ← Back to Quizzes
        </Link>
        <div className="flex items-center gap-2">
          <Leaf size={18} className="text-primary" />
          <span className="font-serif font-bold text-primary-dark">Preppal</span>
        </div>
        <div />
      </div>

      <div className="max-w-2xl mx-auto p-6">
        {/* Score card */}
        <div className="bg-white rounded-2xl p-8 shadow-card mb-5 text-center">
          {/* Circular progress */}
          <div className="relative inline-flex items-center justify-center mb-4">
            <svg width="130" height="130" className="-rotate-90">
              <circle cx="65" cy="65" r="52" fill="none" stroke="#e5e7eb" strokeWidth="8" />
              <circle cx="65" cy="65" r="52" fill="none" stroke="#4a6741" strokeWidth="8"
                strokeDasharray={circumference} strokeDashoffset={strokeOffset}
                strokeLinecap="round" className="transition-all duration-1000" />
            </svg>
            <div className="absolute text-center">
              <p className="font-serif text-3xl font-bold text-gray-800">{score}/{total}</p>
            </div>
          </div>

          <h2 className="font-serif text-2xl font-bold text-gray-800 mb-1">
            {isPassed ? 'Great job! 🎉' : 'Keep practicing!'}
          </h2>
          <div className="inline-flex items-center gap-1.5 bg-accent/20 text-secondary px-3 py-1 rounded-full text-sm font-semibold mb-4">
            +{score * 10} XP
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3 mt-2">
            <div className="bg-cream rounded-xl p-3">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <CheckCircle size={16} className="text-green-600" />
                <span className="text-lg font-bold text-gray-800">{score}</span>
              </div>
              <p className="text-xs text-gray-500">Correct</p>
            </div>
            <div className="bg-cream rounded-xl p-3">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <XCircle size={16} className="text-red-500" />
                <span className="text-lg font-bold text-gray-800">{total - score}</span>
              </div>
              <p className="text-xs text-gray-500">Incorrect</p>
            </div>
            <div className="bg-cream rounded-xl p-3">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <span className="text-lg font-bold text-gray-800">{percentage}%</span>
              </div>
              <p className="text-xs text-gray-500">Score</p>
            </div>
          </div>
        </div>

        {/* New achievements */}
        {new_achievements?.length > 0 && (
          <div className="bg-white rounded-2xl p-5 shadow-card mb-5">
            <div className="flex items-center gap-2 mb-3">
              <Award className="text-yellow-500" size={20} />
              <h3 className="font-semibold text-gray-800">New Achievements!</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {new_achievements.map((a) => <StreakBadge key={a} label={a} />)}
            </div>
          </div>
        )}

        {/* Study tips */}
        {weak_topics?.length > 0 && (
          <div className="bg-primary rounded-2xl p-5 mb-5 text-white">
            <h3 className="font-semibold mb-3">Study Tips based on your performance</h3>
            <div className="grid grid-cols-2 gap-2">
              {weak_topics.map((t) => (
                <div key={t} className="flex items-center gap-2 text-sm text-white/90">
                  <span>📚</span> Review {t}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Answer review */}
        <div className="bg-white rounded-2xl p-5 shadow-card mb-5">
          <h3 className="font-semibold text-gray-800 mb-4">Answer Review</h3>
          <div className="space-y-3">
            {questions?.map((question, index) => {
              const userAnswer = user_answers?.[index] || ''
              const correctAnswer = correct_answers?.[index] || ''
              let isCorrect = false
              let displayCorrect = correctAnswer
              if (question.type === 'mcq') {
                const m = userAnswer.trim().match(/^([A-Da-d])[.)]\s*/)
                const userLetter = m ? m[1].toUpperCase() : userAnswer.trim().toUpperCase()
                isCorrect = userLetter === correctAnswer.trim().toUpperCase()
                const opt = question.options?.find((o) =>
                  o.trim().toUpperCase().startsWith(correctAnswer.trim().toUpperCase() + '.') ||
                  o.trim().toUpperCase().startsWith(correctAnswer.trim().toUpperCase() + ')')
                )
                displayCorrect = opt || correctAnswer
              } else {
                isCorrect = userAnswer.replace(/\s+/g, '').toLowerCase() === correctAnswer.replace(/\s+/g, '').toLowerCase()
              }
              const isExpanded = expandedIdx === index

              return (
                <div key={index} className={`rounded-xl border-2 overflow-hidden ${isCorrect ? 'border-green-200' : 'border-red-200'}`}>
                  <div className="flex items-start gap-3 p-3">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${isCorrect ? 'bg-green-500' : 'bg-red-500'}`}>
                      {isCorrect ? <CheckCircle size={12} className="text-white" /> : <XCircle size={12} className="text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800">{question.question}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{isCorrect ? 'Your correct answer' : `Your incorrect answer`}</p>
                      {!isCorrect && (
                        <p className="text-xs text-green-700 mt-0.5">Correct answer: {displayCorrect}</p>
                      )}
                    </div>
                    <button onClick={() => setExpandedIdx(isExpanded ? null : index)}
                      className="text-xs text-gray-400 hover:text-primary flex items-center gap-1 shrink-0">
                      Show Explanation {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>
                  </div>
                  {isExpanded && explanations?.[index] && (
                    <div className="px-4 pb-3 text-xs text-gray-600 bg-gray-50 border-t border-gray-100">
                      <p className="mb-2">{explanations[index]}</p>
                      {!isCorrect && (
                            <button
                              onClick={() => askAiExplain(index, question, explanations[index], displayCorrect)}
                              className="mt-2 flex items-center gap-1.5 text-xs text-primary font-medium hover:underline"
                            >
                              <Bot size={11} /> Ask AI to explain in more detail
                            </button>
                          )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-center">
          <button onClick={() => navigate('/quiz')}
            className="px-6 py-2.5 border border-gray-200 bg-white text-gray-700 rounded-2xl text-sm font-semibold hover:bg-cream transition-colors">
            Retry Quiz
          </button>
          <button onClick={() => navigate('/quiz')}
            className="px-6 py-2.5 bg-primary-dark hover:bg-primary text-white rounded-2xl text-sm font-semibold transition-colors">
            New Quiz
          </button>
          <Link to="/chat"
            className="px-6 py-2.5 border border-gray-200 bg-white text-gray-700 rounded-2xl text-sm font-semibold hover:bg-cream transition-colors flex items-center gap-2">
            <Bot size={14} /> Ask AI Tutor
          </Link>
        </div>
      </div>
    </div>
  )
}
