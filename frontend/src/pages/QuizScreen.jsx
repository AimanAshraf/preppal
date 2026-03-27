import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ChevronLeft, ChevronRight, Send } from 'lucide-react'
import api from '../api/axios.js'
import QuestionCard from '../components/QuestionCard.jsx'

export default function QuizScreen() {
  const { quizId } = useParams()
  const navigate = useNavigate()
  const [quiz, setQuiz] = useState(null)
  const [answers, setAnswers] = useState([])
  const [current, setCurrent] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    api.get(`/api/quiz/history`).then((res) => {
      const found = res.data.find((q) => q.id === quizId)
      if (found && found.completed_at) {
        navigate(`/quiz/${quizId}/result`, { replace: true })
      }
    }).catch(() => {})
  }, [quizId])

  useEffect(() => {
    const stored = sessionStorage.getItem(`quiz_${quizId}`)
    if (stored) {
      const data = JSON.parse(stored)
      setQuiz(data)
      setAnswers(new Array(data.questions.length).fill(''))
    } else {
      // Page was refreshed — fetch quiz from API
      api.get(`/api/quiz/${quizId}`)
        .then((res) => {
          setQuiz(res.data)
          setAnswers(new Array(res.data.questions.length).fill(''))
          sessionStorage.setItem(`quiz_${quizId}`, JSON.stringify(res.data))
        })
        .catch(() => {
          toast.error('Quiz not found or already completed.')
          navigate('/quiz')
        })
    }
  }, [quizId])

  const setAnswer = (value) => {
    setAnswers((prev) => {
      const next = [...prev]
      next[current] = value
      return next
    })
  }

  const handleSubmit = async () => {
    if (answers.some((a) => !a)) {
      toast.error('Please answer all questions before submitting')
      return
    }
    setSubmitting(true)
    try {
      const res = await api.post(`/api/quiz/${quizId}/submit`, { answers })
      sessionStorage.setItem(`result_${quizId}`, JSON.stringify({ ...res.data, questions: quiz.questions, user_answers: answers }))
      sessionStorage.removeItem(`quiz_${quizId}`)
      navigate(`/quiz/${quizId}/result`)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to submit quiz')
    } finally {
      setSubmitting(false)
    }
  }

  if (!quiz) return null

  const question = quiz.questions[current]
  const total = quiz.questions.length
  const progress = ((current + 1) / total) * 100

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div>
          <span className="font-semibold text-gray-700">{quiz.difficulty?.toUpperCase()} Quiz</span>
          <span className="text-gray-400 text-sm ml-3">Question {current + 1} of {total}</span>
        </div>
        <span className="text-sm text-gray-500">{answers.filter(Boolean).length}/{total} answered</span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-gray-200">
        <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
      </div>

      {/* Question */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-2xl">
          <QuestionCard
            question={question}
            answer={answers[current]}
            onAnswer={setAnswer}
          />
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white border-t px-6 py-4 flex items-center justify-between">
        <button
          onClick={() => setCurrent((c) => c - 1)}
          disabled={current === 0}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-40 transition-colors"
        >
          <ChevronLeft size={18} /> Previous
        </button>

        {current < total - 1 ? (
          <button
            onClick={() => setCurrent((c) => c + 1)}
            className="flex items-center gap-2 px-5 py-2 bg-primary text-white rounded-lg hover:bg-indigo-600 transition-colors"
          >
            Next <ChevronRight size={18} />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex items-center gap-2 px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-60"
          >
            <Send size={18} /> {submitting ? 'Submitting...' : 'Submit Quiz'}
          </button>
        )}
      </div>
    </div>
  )
}
