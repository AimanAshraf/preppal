import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Brain, Zap, ChevronDown, BarChart2, X } from 'lucide-react'
import Sidebar from '../components/Sidebar.jsx'
import Navbar from '../components/Navbar.jsx'
import api from '../api/axios.js'

const DIFFICULTIES = ['easy', 'medium', 'hard']
const QUESTION_TYPES = ['mcq', 'truefalse', 'fillblank']
const TYPE_LABELS = { mcq: 'Multiple Choice', truefalse: 'True / False', fillblank: 'Fill in the Blank' }

export default function QuizHub() {
  const [materials, setMaterials] = useState([])
  const [topics, setTopics] = useState([])
  const [loadingTopics, setLoadingTopics] = useState(false)
  const [materialStats, setMaterialStats] = useState(null)
  const [showStats, setShowStats] = useState(false)
  const [form, setForm] = useState({
    material_id: '',
    difficulty: 'medium',
    num_questions: 10,
    question_types: ['mcq', 'truefalse', 'fillblank'],
    selected_topics: [],
  })
  const [generating, setGenerating] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    api.get('/api/materials').then((res) => setMaterials(res.data)).catch(() => {})
  }, [])

  // When material changes, fetch its topics and stats
  useEffect(() => {
    if (!form.material_id) {
      setTopics([])
      setMaterialStats(null)
      return
    }
    setLoadingTopics(true)
    setTopics([])
    setForm((prev) => ({ ...prev, selected_topics: [] }))

    Promise.all([
      api.get(`/api/materials/${form.material_id}/topics`),
      api.get(`/api/progress/material/${form.material_id}`),
    ]).then(([topicsRes, statsRes]) => {
      setTopics(topicsRes.data.topics || [])
      setMaterialStats(statsRes.data)
    }).catch(() => {
      setTopics([])
    }).finally(() => setLoadingTopics(false))
  }, [form.material_id])

  const toggleType = (type) => {
    setForm((prev) => ({
      ...prev,
      question_types: prev.question_types.includes(type)
        ? prev.question_types.filter((t) => t !== type)
        : [...prev.question_types, type],
    }))
  }

  const toggleTopic = (topic) => {
    setForm((prev) => ({
      ...prev,
      selected_topics: prev.selected_topics.includes(topic)
        ? prev.selected_topics.filter((t) => t !== topic)
        : [...prev.selected_topics, topic],
    }))
  }

  const selectAllTopics = () => setForm((prev) => ({ ...prev, selected_topics: [...topics] }))
  const clearTopics = () => setForm((prev) => ({ ...prev, selected_topics: [] }))

  const buildPayload = () => ({
    material_id: form.material_id,
    difficulty: form.difficulty,
    num_questions: form.num_questions,
    question_types: form.question_types,
    selected_topics: form.selected_topics.length > 0 ? form.selected_topics : null,
  })

  const handleGenerate = async () => {
    if (!form.material_id) { toast.error('Please select a study material'); return }
    if (form.question_types.length === 0) { toast.error('Select at least one question type'); return }
    setGenerating(true)
    try {
      const res = await api.post('/api/quiz/generate', buildPayload())
      sessionStorage.setItem(`quiz_${res.data.id}`, JSON.stringify(res.data))
      toast.success('Quiz generated!')
      navigate(`/quiz/${res.data.id}`)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to generate quiz')
    } finally {
      setGenerating(false)
    }
  }

  const handleGapFill = async () => {
    if (!form.material_id) { toast.error('Please select a study material'); return }
    setGenerating(true)
    try {
      const res = await api.post('/api/quiz/gap-fill', {
        material_id: form.material_id,
        difficulty: form.difficulty,
        num_questions: form.num_questions,
        question_types: form.question_types,
      })
      sessionStorage.setItem(`quiz_${res.data.id}`, JSON.stringify(res.data))
      toast.success('Adaptive quiz generated!')
      navigate(`/quiz/${res.data.id}`)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to generate quiz')
    } finally {
      setGenerating(false)
    }
  }

  const selectedMaterial = materials.find((m) => m.id === form.material_id)

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar title="Quiz Hub" />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl space-y-4">

            {/* Material */}
            <div className="bg-white rounded-xl shadow-sm p-6 space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Study Material</label>
                <select
                  value={form.material_id}
                  onChange={(e) => setForm({ ...form, material_id: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Choose a material...</option>
                  {materials.map((m) => <option key={m.id} value={m.id}>{m.filename}</option>)}
                </select>
              </div>

              {/* Topics */}
              {form.material_id && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-semibold text-gray-700">
                      Topics
                      {form.selected_topics.length > 0 && (
                        <span className="ml-2 text-primary text-xs font-normal">
                          {form.selected_topics.length} selected
                        </span>
                      )}
                    </label>
                    {topics.length > 0 && (
                      <div className="flex gap-2 text-xs">
                        <button onClick={selectAllTopics} className="text-primary hover:underline">All</button>
                      </div>
                    )}
                  </div>

                  {loadingTopics ? (
                    <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                      Analyzing document...
                    </div>
                  ) : topics.length === 0 ? (
                    <p className="text-sm text-gray-400">No topics found in this material.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {topics.map((topic) => {
                        const isSelected = form.selected_topics.includes(topic)
                        const accuracy = materialStats?.topic_scores?.[topic]
                        return (
                          <button
                            key={topic}
                            onClick={() => toggleTopic(topic)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                              isSelected
                                ? 'bg-primary text-white border-primary'
                                : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-primary'
                            }`}
                          >
                            {topic}
                            {accuracy !== undefined && (
                              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                                isSelected ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-600'
                              }`}>
                                {accuracy}%
                              </span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  )}
                  {form.selected_topics.length === 0 && topics.length > 0 && (
                    <p className="text-xs text-gray-400 mt-2">No topics selected — quiz will cover all topics.</p>
                  )}                </div>
              )}
            </div>

            {/* Material Stats */}
            {materialStats && materialStats.total_quizzes > 0 && (
              <div className="bg-white rounded-xl shadow-sm p-4">
                <button
                  onClick={() => setShowStats((s) => !s)}
                  className="w-full flex items-center justify-between text-sm font-semibold text-gray-700"
                >
                  <div className="flex items-center gap-2">
                    <BarChart2 size={16} className="text-primary" />
                    Material Stats ({materialStats.total_quizzes} quiz{materialStats.total_quizzes !== 1 ? 'zes' : ''} taken)
                  </div>
                  <ChevronDown size={16} className={`transition-transform ${showStats ? 'rotate-180' : ''}`} />
                </button>

                {showStats && (
                  <div className="mt-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-gray-50 rounded-lg p-3 text-center">
                        <p className="text-xs text-gray-500">Avg Score</p>
                        <p className="text-2xl font-bold text-primary">{materialStats.avg_score}%</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3 text-center">
                        <p className="text-xs text-gray-500">Best Score</p>
                        <p className="text-2xl font-bold text-green-600">{materialStats.best_score}%</p>
                      </div>
                    </div>
                    {Object.keys(materialStats.topic_scores || {}).length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 mb-2">Topic Accuracy</p>
                        <div className="space-y-2">
                          {Object.entries(materialStats.topic_scores).sort((a, b) => a[1] - b[1]).map(([topic, acc]) => (
                            <div key={topic}>
                              <div className="flex justify-between text-xs text-gray-600 mb-0.5">
                                <span>{topic}</span>
                                <span className={acc < 50 ? 'text-red-500 font-medium' : acc < 75 ? 'text-orange-500 font-medium' : 'text-green-600 font-medium'}>{acc}%</span>
                              </div>
                              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${acc < 50 ? 'bg-red-400' : acc < 75 ? 'bg-orange-400' : 'bg-green-500'}`}
                                  style={{ width: `${acc}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Quiz config */}
            <div className="bg-white rounded-xl shadow-sm p-6 space-y-6">
              {/* Difficulty */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Difficulty</label>
                <div className="flex gap-3">
                  {DIFFICULTIES.map((d) => (
                    <button
                      key={d}
                      onClick={() => setForm({ ...form, difficulty: d })}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                        form.difficulty === d ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              {/* Question count */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Number of Questions: <span className="text-primary">{form.num_questions}</span>
                </label>
                <input
                  type="range" min={5} max={20} step={5}
                  value={form.num_questions}
                  onChange={(e) => setForm({ ...form, num_questions: parseInt(e.target.value) })}
                  className="w-full accent-primary"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>5</span><span>10</span><span>15</span><span>20</span>
                </div>
              </div>

              {/* Question types */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Question Types</label>
                <div className="flex gap-3 flex-wrap">
                  {QUESTION_TYPES.map((t) => (
                    <button
                      key={t}
                      onClick={() => toggleType(t)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        form.question_types.includes(t) ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {TYPE_LABELS[t]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="flex-1 bg-primary text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-indigo-600 transition-colors disabled:opacity-60"
                >
                  <Brain size={18} />
                  {generating ? 'Generating...' : 'Generate Quiz'}
                </button>
                <button
                  onClick={handleGapFill}
                  disabled={generating}
                  className="flex-1 bg-secondary text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-violet-600 transition-colors disabled:opacity-60"
                  title="Adaptive quiz targeting your weak areas"
                >
                  <Zap size={18} />
                  Gap Fill
                </button>
              </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  )
}
