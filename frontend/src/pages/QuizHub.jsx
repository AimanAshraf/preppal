import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Brain, Zap, ChevronRight } from 'lucide-react'
import Sidebar from '../components/Sidebar.jsx'
import Navbar from '../components/Navbar.jsx'
import api from '../api/axios.js'

const DIFFICULTIES = ['easy', 'medium', 'hard']
const QUESTION_TYPES = ['mcq', 'truefalse', 'fillblank']
const TYPE_LABELS = { mcq: 'Multiple Choice', truefalse: 'True / False', fillblank: 'Fill in the Blank' }

export default function QuizHub() {
  const [materials, setMaterials] = useState([])
  const [form, setForm] = useState({
    material_id: '',
    difficulty: 'medium',
    num_questions: 10,
    question_types: ['mcq', 'truefalse', 'fillblank'],
  })
  const [generating, setGenerating] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    api.get('/api/materials').then((res) => setMaterials(res.data)).catch(() => {})
  }, [])

  const toggleType = (type) => {
    setForm((prev) => ({
      ...prev,
      question_types: prev.question_types.includes(type)
        ? prev.question_types.filter((t) => t !== type)
        : [...prev.question_types, type],
    }))
  }

  const handleGenerate = async () => {
    if (!form.material_id) { toast.error('Please select a study material'); return }
    if (form.question_types.length === 0) { toast.error('Select at least one question type'); return }
    setGenerating(true)
    try {
      const res = await api.post('/api/quiz/generate', form)
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

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar title="Quiz Hub" />
        <main className="flex-1 overflow-y-auto p-6 max-w-2xl">
          <div className="bg-white rounded-xl shadow-sm p-6 space-y-6">

            {/* Material */}
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

            {/* Difficulty */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Difficulty</label>
              <div className="flex gap-3">
                {DIFFICULTIES.map((d) => (
                  <button
                    key={d}
                    onClick={() => setForm({ ...form, difficulty: d })}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                      form.difficulty === d
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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
                type="range"
                min={5} max={20} step={5}
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
                      form.question_types.includes(t)
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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
        </main>
      </div>
    </div>
  )
}
