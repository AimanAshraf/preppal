import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ChevronLeft, ChevronRight, Send, Leaf } from 'lucide-react'
import api from '../api/axios.js'
import QuestionCard from '../components/QuestionCard.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'

export default function QuizScreen() {
  const { quizId } = useParams()
  const navigate = useNavigate()
  const [quiz, setQuiz] = useState(null)
  const [answers, setAnswers] = useState([])
  const [current, setCurrent] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [showExitConfirm, setShowExitConfirm] = useState(false)
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false)
  const [timeLeft, setTimeLeft] = useState(30)
  const timerRef = useRef(null)

  useEffect(() => {
    api.get(`/api/quiz/history`).then((res) => {
      const found = res.data.quizzes?.find((q) => q.id === quizId)
      if (found && found.completed_at) navigate(`/quiz/${quizId}/result`, { replace: true })
    }).catch(() => {})

    const stored = sessionStorage.getItem(`quiz_${quizId}`)
    if (stored) {
      const data = JSON.parse(stored)
      setQuiz(data)
      setAnswers(new Array(data.questions.length).fill(''))
    } else {
      api.get(`/api/quiz/${quizId}`)
        .then((res) => {
          setQuiz(res.data)
          setAnswers(new Array(res.data.questions.length).fill(''))
          sessionStorage.setItem(`quiz_${quizId}`, JSON.stringify(res.data))
        })
        .catch(() => { toast.error('Quiz not found.'); navigate('/quiz') })
    }
  }, [quizId])

  // Per-question timer
  useEffect(() => {
    if (!quiz) return
    setTimeLeft(30)
    clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { clearInterval(timerRef.current); return 0 }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [current, quiz])

  const setAnswer = (value) => {
    setAnswers((prev) => { const next = [...prev]; next[current] = value; return next })
  }

  const handleSubmit = async () => {
    const unanswered = answers.filter((a) => !a).length
    if (unanswered > 0) {
      toast.error(`${unanswered} question${unanswered > 1 ? 's' : ''} still unanswered`)
      return
    }
    setShowSubmitConfirm(true)
  }

  const doSubmit = async () => {
    setShowSubmitConfirm(false)
    setSubmitting(true)
    const toastId = toast.loading('Submitting quiz...')
    try {
      const res = await api.post(`/api/quiz/${quizId}/submit`, { answers })
      sessionStorage.setItem(`result_${quizId}`, JSON.stringify({ ...res.data, questions: quiz.questions, user_answers: answers, material_id: quiz.material_id }))
      sessionStorage.removeItem(`quiz_${quizId}`)
      toast.success('Quiz submitted!', { id: toastId })
      navigate(`/quiz/${quizId}/result`)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to submit quiz', { id: toastId })
    } finally { setSubmitting(false) }
  }

  if (!quiz) return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
    </div>
  )

  const question = quiz.questions[current]
  const total = quiz.questions.length
  const progress = ((current + 1) / total) * 100
  const timerPct = (timeLeft / 30) * 100
  const circumference = 2 * Math.PI * 28
  const pointsPerQuestion = Math.round(100 / total)
  const currentScore = answers.filter(Boolean).length * pointsPerQuestion

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      {/* Top bar */}
      <div className="bg-white border-b border-cream-dark px-6 py-3 flex items-center justify-between">
        <button onClick={() => setShowExitConfirm(true)} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary transition-colors">
          <ChevronLeft size={16} /> Back to Quizzes
        </button>
        <div className="flex items-center gap-2">
          <Leaf size={18} className="text-primary" />
          <span className="font-serif font-bold text-primary-dark">Preppal</span>
        </div>
        <span className="text-sm text-gray-500">{current + 1}/{total}</span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-gray-200">
        <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
      </div>

      <div className="flex-1 flex flex-col items-center justify-start p-6 max-w-3xl mx-auto w-full">
        {/* Timer circle */}
        <div className="mb-6 mt-4">
          <svg width="72" height="72" className="-rotate-90">
            <circle cx="36" cy="36" r="28" fill="none" stroke="#e5e7eb" strokeWidth="5" />
            <circle cx="36" cy="36" r="28" fill="none" stroke={timeLeft <= 10 ? '#ef4444' : '#4a6741'}
              strokeWidth="5" strokeDasharray={circumference}
              strokeDashoffset={circumference - (timerPct / 100) * circumference}
              strokeLinecap="round" className="transition-all duration-1000" />
          </svg>
          <div className="absolute" style={{ marginTop: '-52px', marginLeft: '18px' }}>
            <span className="text-sm font-bold text-gray-700">
              {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
            </span>
          </div>
        </div>

        {/* Topic + question number */}
        <div className="flex items-center gap-3 mb-4 self-start">
          {question.topic && (
            <span className="bg-primary/10 text-primary text-xs font-semibold px-3 py-1 rounded-full">
              {question.topic}
            </span>
          )}
          <span className="text-sm text-gray-500">Question {current + 1} of {total}</span>
        </div>

        {/* Question card */}
        <div className="w-full mb-6">
          <QuestionCard question={question} answer={answers[current]} onAnswer={setAnswer} />
        </div>

        {/* Score sidebar */}
        <div className="fixed right-6 top-1/3 bg-accent/20 border border-accent/30 rounded-xl p-3 text-xs text-center hidden lg:block">
          <p className="text-gray-600">Points Available: <span className="font-bold">{total * pointsPerQuestion}</span></p>
          <p className="text-gray-600 mt-1">Current Score: <span className="font-bold">{currentScore}</span></p>
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-4 mt-auto">
          <button onClick={() => setCurrent((c) => c - 1)} disabled={current === 0}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-white disabled:opacity-40 transition-colors bg-white">
            <ChevronLeft size={16} /> Previous
          </button>
          {current < total - 1 ? (
            <button onClick={() => setCurrent((c) => c + 1)}
              className="flex items-center gap-2 px-6 py-2.5 bg-primary-dark hover:bg-primary text-white rounded-2xl text-sm font-semibold transition-colors">
              Next <ChevronRight size={16} />
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={submitting}
              className="flex items-center gap-2 px-6 py-2.5 bg-primary-dark hover:bg-primary text-white rounded-2xl text-sm font-semibold transition-colors disabled:opacity-60">
              <Send size={16} /> {submitting ? 'Submitting...' : 'Submit Quiz'}
            </button>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={showExitConfirm}
        title="Leave Quiz?"
        message="Your progress will be lost if you leave now. Are you sure you want to exit?"
        confirmLabel="Leave Quiz"
        confirmClass="bg-orange-500 hover:bg-orange-600"
        onConfirm={() => navigate('/quiz')}
        onCancel={() => setShowExitConfirm(false)}
      />

      <ConfirmDialog
        open={showSubmitConfirm}
        title="Submit Quiz?"
        message={`You've answered ${answers.filter(Boolean).length} of ${quiz?.questions?.length || 0} questions. Submit now?`}
        confirmLabel="Submit"
        confirmClass="bg-primary-dark hover:bg-primary"
        onConfirm={doSubmit}
        onCancel={() => setShowSubmitConfirm(false)}
      />
    </div>
  )
}
