import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Brain, Zap, ChevronDown, BarChart2, ChevronRight, CheckCircle, Clock, BookOpen } from 'lucide-react'
import Sidebar from '../components/Sidebar.jsx'
import Navbar from '../components/Navbar.jsx'
import api from '../api/axios.js'
import { formatDate } from '../utils/helpers.js'

const DIFFICULTIES = ['easy', 'medium', 'hard']
const QUESTION_TYPES = ['mcq', 'truefalse', 'fillblank']
const TYPE_LABELS = { mcq: 'Multiple Choice', truefalse: 'True / False', fillblank: 'Fill in the Blank' }
const DIFF_COLORS = { easy: 'bg-green-100 text-green-700', medium: 'bg-yellow-100 text-yellow-700', hard: 'bg-red-100 text-red-700' }

export default function QuizHub() {
  const [tab, setTab] = useState('generate')
  const [materials, setMaterials] = useState([])
  const [topics, setTopics] = useState([])
  const [loadingTopics, setLoadingTopics] = useState(false)
  const [materialStats, setMaterialStats] = useState(null)
  const [showStats, setShowStats] = useState(false)
  const [quizHistory, setQuizHistory] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [expandedMaterial, setExpandedMaterial] = useState(null)
  const [form, setForm] = useState({
    material_id: '',
    difficulty: 'medium',
    num_questions: 10,
    question_types: ['mcq', 'truefalse', 'fillblank'],
    selected_topics: [],
  })
  const [generating, setGenerating] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  const loadHistory = async () => {
    setLoadingHistory(true)
    try {
      const res = await api.get('/api/quiz/history?limit=50')
      const raw = Array.isArray(res.data) ? res.data : (res.data.quizzes || [])
      setQuizHistory(raw)
    } catch (err) {
      console.error('history error:', err)
    } finally {
      setLoadingHistory(false)
    }
  }

  useEffect(() => {
    api.get('/api/materials').then((res) => {
      setMaterials(res.data)
      if (location.state?.material_id) {
        setForm((prev) => ({ ...prev, material_id: location.state.material_id }))
      }
    }).catch(() => {})
    loadHistory()
  }, [])

  useEffect(() => {
    if (tab === 'history') loadHistory()
  }, [tab])

  useEffect(() => {
    if (!form.material_id) { setTopics([]); setMaterialStats(null); return }
    setLoadingTopics(true)
    setTopics([])
    setForm((prev) => ({ ...prev, selected_topics: [] }))
    Promise.all([
      api.get(`/api/materials/${form.material_id}/topics`),
      api.get(`/api/progress/material/${form.material_id}`),
    ]).then(([t, s]) => { setTopics(t.data.topics || []); setMaterialStats(s.data) })
      .catch(() => setTopics([]))
      .finally(() => setLoadingTopics(false))
  }, [form.material_id])

  const toggleType = (type) => setForm((prev) => ({
    ...prev,
    question_types: prev.question_types.includes(type)
      ? prev.question_types.filter((t) => t !== type)
      : [...prev.question_types, type],
  }))

  const toggleTopic = (topic) => setForm((prev) => ({
    ...prev,
    selected_topics: prev.selected_topics.includes(topic)
      ? prev.selected_topics.filter((t) => t !== topic)
      : [...prev.selected_topics, topic],
  }))

  const handleGenerate = async () => {
    if (!form.material_id) { toast.error('Please select a study material'); return }
    if (form.question_types.length === 0) { toast.error('Select at least one question type'); return }
    setGenerating(true)
    const toastId = toast.loading('Generating quiz...')
    try {
      const res = await api.post('/api/quiz/generate', {
        material_id: form.material_id,
        difficulty: form.difficulty,
        num_questions: form.num_questions,
        question_types: form.question_types,
        selected_topics: form.selected_topics.length > 0 ? form.selected_topics : null,
      })
      sessionStorage.setItem(`quiz_${res.data.id}`, JSON.stringify(res.data))
      toast.success('Quiz ready!', { id: toastId })
      navigate(`/quiz/${res.data.id}`)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to generate quiz', { id: toastId })
    } finally { setGenerating(false) }
  }

  const handleGapFill = async () => {
    if (!form.material_id) { toast.error('Please select a study material'); return }
    setGenerating(true)
    const toastId = toast.loading('Generating adaptive quiz...')
    try {
      const res = await api.post('/api/quiz/gap-fill', {
        material_id: form.material_id,
        difficulty: form.difficulty,
        num_questions: form.num_questions,
        question_types: form.question_types,
      })
      sessionStorage.setItem(`quiz_${res.data.id}`, JSON.stringify(res.data))
      toast.success('Adaptive quiz ready!', { id: toastId })
      navigate(`/quiz/${res.data.id}`)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to generate quiz', { id: toastId })
    } finally { setGenerating(false) }
  }

  const historyByMaterial = quizHistory.reduce((acc, quiz) => {
    const key = quiz.material_id || 'unknown'
    const name = quiz.material_filename || 'Unknown Material'
    if (!acc[key]) acc[key] = { name, quizzes: [] }
    acc[key].quizzes.push(quiz)
    return acc
  }, {})

  return (
    <div className="flex h-screen bg-cream overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-6">

          <div className="flex items-center justify-between mb-5">
            <h1 className="font-serif text-3xl font-bold text-gray-800">Quiz Library</h1>
            <div className="flex bg-white rounded-xl border border-gray-200 p-1 gap-1">
              <button onClick={() => setTab('generate')}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === 'generate' ? 'bg-primary text-white' : 'text-gray-600 hover:bg-cream'}`}>
                Generate
              </button>
              <button onClick={() => setTab('history')}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === 'history' ? 'bg-primary text-white' : 'text-gray-600 hover:bg-cream'}`}>
                History
              </button>
            </div>
          </div>

          {tab === 'generate' && (
            <div className="flex flex-col items-center">
              <div className="w-full max-w-2xl space-y-4">

                {/* Material + topics */}
                <div className="bg-white rounded-2xl p-6 shadow-card space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Study Material</label>
                    <select value={form.material_id} onChange={(e) => setForm({ ...form, material_id: e.target.value })}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30">
                      <option value="">Choose a material...</option>
                      {materials.map((m) => <option key={m.id} value={m.id}>{m.filename}</option>)}
                    </select>
                  </div>

                  {form.material_id && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-semibold text-gray-700">
                          Topics
                          {form.selected_topics.length > 0 && (
                            <span className="ml-2 text-primary text-xs font-normal">{form.selected_topics.length} selected</span>
                          )}
                        </label>
                        {topics.length > 0 && (
                          <button onClick={() => setForm((p) => ({ ...p, selected_topics: [...topics] }))}
                            className="text-xs text-primary hover:underline">Select All</button>
                        )}
                      </div>
                      {loadingTopics ? (
                        <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                          Analyzing document...
                        </div>
                      ) : topics.length === 0 ? (
                        <p className="text-sm text-gray-400">No topics found.</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {topics.map((topic) => {
                            const isSelected = form.selected_topics.includes(topic)
                            const accuracy = materialStats?.topic_scores?.[topic]
                            return (
                              <button key={topic} onClick={() => toggleTopic(topic)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors border ${
                                  isSelected ? 'bg-primary text-white border-primary' : 'bg-cream text-gray-700 border-gray-200 hover:border-primary'
                                }`}>
                                {topic}
                                {accuracy !== undefined && (
                                  <span className={`text-xs px-1 rounded-full ${isSelected ? 'bg-white/20' : 'bg-gray-200 text-gray-500'}`}>{accuracy}%</span>
                                )}
                              </button>
                            )
                          })}
                        </div>
                      )}
                      {form.selected_topics.length === 0 && topics.length > 0 && (
                        <p className="text-xs text-gray-400 mt-2">No topics selected — quiz will cover all topics.</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Material stats */}
                {materialStats && materialStats.total_quizzes > 0 && (
                  <div className="bg-white rounded-2xl p-4 shadow-card">
                    <button onClick={() => setShowStats((s) => !s)}
                      className="w-full flex items-center justify-between text-sm font-semibold text-gray-700">
                      <div className="flex items-center gap-2">
                        <BarChart2 size={16} className="text-primary" />
                        Material Stats ({materialStats.total_quizzes} quiz{materialStats.total_quizzes !== 1 ? 'zes' : ''})
                      </div>
                      <ChevronDown size={16} className={`transition-transform ${showStats ? 'rotate-180' : ''}`} />
                    </button>
                    {showStats && (
                      <div className="mt-4 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-cream rounded-xl p-3 text-center">
                            <p className="text-xs text-gray-500">Avg Score</p>
                            <p className="text-xl font-bold text-primary">{materialStats.avg_score}%</p>
                          </div>
                          <div className="bg-cream rounded-xl p-3 text-center">
                            <p className="text-xs text-gray-500">Best Score</p>
                            <p className="text-xl font-bold text-green-600">{materialStats.best_score}%</p>
                          </div>
                        </div>
                        {Object.keys(materialStats.topic_scores || {}).length > 0 && (
                          <div className="space-y-2">
                            {Object.entries(materialStats.topic_scores).sort((a, b) => a[1] - b[1]).map(([topic, acc]) => (
                              <div key={topic}>
                                <div className="flex justify-between text-xs text-gray-600 mb-0.5">
                                  <span>{topic}</span>
                                  <span className={acc < 50 ? 'text-red-500 font-medium' : acc < 75 ? 'text-yellow-600 font-medium' : 'text-green-600 font-medium'}>{acc}%</span>
                                </div>
                                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                  <div className={`h-full rounded-full ${acc < 50 ? 'bg-red-400' : acc < 75 ? 'bg-yellow-400' : 'bg-green-500'}`}
                                    style={{ width: `${acc}%` }} />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Quiz config */}
                <div className="bg-white rounded-2xl p-6 shadow-card space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Difficulty</label>
                    <div className="flex gap-2">
                      {DIFFICULTIES.map((d) => (
                        <button key={d} onClick={() => setForm({ ...form, difficulty: d })}
                          className={`flex-1 py-2.5 rounded-xl text-sm font-medium capitalize transition-colors ${form.difficulty === d ? 'bg-primary text-white' : 'bg-cream text-gray-600 hover:bg-cream-dark'}`}>
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Questions: <span className="text-primary">{form.num_questions}</span>
                    </label>
                    <input type="range" min={5} max={20} step={5} value={form.num_questions}
                      onChange={(e) => setForm({ ...form, num_questions: parseInt(e.target.value) })}
                      className="w-full accent-primary" />
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                      <span>5</span><span>10</span><span>15</span><span>20</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Question Types</label>
                    <div className="flex gap-2 flex-wrap">
                      {QUESTION_TYPES.map((t) => (
                        <button key={t} onClick={() => toggleType(t)}
                          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${form.question_types.includes(t) ? 'bg-primary text-white' : 'bg-cream text-gray-600 hover:bg-cream-dark'}`}>
                          {TYPE_LABELS[t]}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-3 pt-1">
                    <button onClick={handleGenerate} disabled={generating}
                      className="flex-1 bg-primary-dark hover:bg-primary text-white py-3 rounded-2xl font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-60">
                      <Brain size={18} />
                      {generating ? 'Generating...' : 'Generate Quiz'}
                    </button>
                    <button onClick={handleGapFill} disabled={generating}
                      className="flex-1 bg-secondary hover:bg-secondary/80 text-white py-3 rounded-2xl font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-60">
                      <Zap size={18} />
                      Gap Fill
                    </button>
                  </div>
                </div>

              </div>
            </div>
          )}

          {tab === 'history' && (
            <div className="flex flex-col items-center">
              <div className="w-full max-w-3xl space-y-3">
              {loadingHistory ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : quizHistory.length === 0 ? (
                <div className="bg-white rounded-2xl p-10 shadow-card text-center text-gray-400">
                  <BookOpen size={40} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No quizzes taken yet. Generate your first quiz!</p>
                </div>
              ) : (
                Object.entries(historyByMaterial).map(([materialId, { name, quizzes }]) => {
                  const isExpanded = expandedMaterial === materialId
                  const byTopic = quizzes.reduce((acc, q) => {
                    const topicKey = q.selected_topics?.length > 0 ? q.selected_topics.join(', ') : 'All Topics'
                    if (!acc[topicKey]) acc[topicKey] = []
                    acc[topicKey].push(q)
                    return acc
                  }, {})

                  return (
                    <div key={materialId} className="bg-white rounded-2xl shadow-card overflow-hidden">
                      <button onClick={() => setExpandedMaterial(isExpanded ? null : materialId)}
                        className="w-full flex items-center gap-3 p-4 hover:bg-cream transition-colors text-left">
                        <div className="w-9 h-9 bg-red-100 rounded-xl flex items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-red-600">PDF</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-800 text-sm truncate">{name}</p>
                          <p className="text-xs text-gray-400">{quizzes.length} quiz{quizzes.length !== 1 ? 'zes' : ''} taken</p>
                        </div>
                        <ChevronDown size={16} className={`text-gray-400 transition-transform shrink-0 ${isExpanded ? 'rotate-180' : ''}`} />
                      </button>

                      {isExpanded && (
                        <div className="border-t border-cream-dark">
                          {Object.entries(byTopic).map(([topicKey, topicQuizzes]) => (
                            <div key={topicKey} className="border-b border-cream-dark last:border-0">
                              <div className="px-4 py-2 bg-cream/50">
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{topicKey}</p>
                              </div>
                              {topicQuizzes.map((quiz) => {
                                const pct = quiz.score != null
                                  ? Math.round((quiz.score / (quiz.total_questions || 10)) * 100)
                                  : null
                                const isCompleted = !!quiz.completed_at
                                return (
                                  <button key={quiz.id}
                                    onClick={() => isCompleted ? navigate(`/quiz/${quiz.id}/result`) : null}
                                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-cream transition-colors text-left">
                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${isCompleted ? 'bg-green-100' : 'bg-gray-100'}`}>
                                      {isCompleted
                                        ? <CheckCircle size={14} className="text-green-600" />
                                        : <Clock size={14} className="text-gray-400" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${DIFF_COLORS[quiz.difficulty] || 'bg-gray-100 text-gray-600'}`}>
                                          {quiz.difficulty}
                                        </span>
                                        {quiz.is_gap_fill && (
                                          <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium">Gap Fill</span>
                                        )}
                                      </div>
                                      <p className="text-xs text-gray-400 mt-0.5">{formatDate(quiz.created_at)}</p>
                                    </div>
                                    <div className="text-right shrink-0">
                                      {pct !== null ? (
                                        <p className={`text-sm font-bold ${pct >= 70 ? 'text-green-600' : 'text-orange-500'}`}>{pct}%</p>
                                      ) : (
                                        <p className="text-xs text-gray-400">In progress</p>
                                      )}
                                    </div>
                                    <ChevronRight size={14} className="text-gray-300 shrink-0" />
                                  </button>
                                )
                              })}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })
              )}
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  )
}
