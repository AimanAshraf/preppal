import { useState, useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import { Upload, FileText, Trash2, Calendar, Plus, Search, Brain } from 'lucide-react'
import Sidebar from '../components/Sidebar.jsx'
import Navbar from '../components/Navbar.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import api from '../api/axios.js'
import { formatDate, formatFileSize } from '../utils/helpers.js'
import { useNavigate } from 'react-router-dom'

export default function Resources() {
  const [materials, setMaterials] = useState([])
  const [uploading, setUploading] = useState(false)
  const [search, setSearch] = useState('')
  const [dragging, setDragging] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null) // { id, filename }
  const fileRef = useRef()
  const navigate = useNavigate()

  const fetchMaterials = async () => {
    try {
      const res = await api.get(`/api/materials${search ? `?search=${encodeURIComponent(search)}` : ''}`)
      setMaterials(res.data)
    } catch {
      toast.error('Failed to load materials')
    }
  }

  useEffect(() => { fetchMaterials() }, [search])

  const uploadFile = async (file) => {
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Only PDF files are accepted')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File too large — maximum size is 10MB')
      return
    }
    const formData = new FormData()
    formData.append('file', file)
    setUploading(true)
    const toastId = toast.loading(`Uploading ${file.name}...`)
    try {
      await api.post('/api/materials/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      toast.success(`"${file.name}" uploaded successfully!`, { id: toastId })
      fetchMaterials()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Upload failed. Please try again.', { id: toastId })
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    uploadFile(e.dataTransfer.files[0])
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    const { id, filename } = deleteTarget
    setDeleteTarget(null)
    const toastId = toast.loading(`Deleting "${filename}"...`)
    try {
      await api.delete(`/api/materials/${id}`)
      toast.success(`"${filename}" deleted`, { id: toastId })
      setMaterials((prev) => prev.filter((m) => m.id !== id))
    } catch {
      toast.error('Failed to delete material', { id: toastId })
    }
  }

  return (
    <div className="flex h-screen bg-cream overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-6">

          <div className="flex items-center justify-between mb-6">
            <h1 className="font-serif text-3xl font-bold text-gray-800">Quiz Resources</h1>
            <button onClick={() => fileRef.current.click()}
              className="flex items-center gap-2 bg-primary-dark hover:bg-primary text-white px-4 py-2.5 rounded-2xl text-sm font-semibold transition-colors">
              <Plus size={16} />
              Add Resources
            </button>
          </div>

          <div className="flex items-center gap-3 mb-5">
            <div className="relative flex-1 max-w-sm">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" placeholder="Search resource by files" value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>

          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current.click()}
            className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all mb-6 ${
              dragging ? 'border-primary bg-primary/5' : 'border-gray-300 bg-white hover:border-primary hover:bg-primary/5'
            }`}
          >
            <Upload className="mx-auto text-gray-400 mb-3" size={36} />
            <p className="font-semibold text-gray-700">
              {uploading ? 'Uploading...' : 'Drag and drop your files here'}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              or <span className="text-primary underline cursor-pointer">Browse Files</span>
            </p>
            <input ref={fileRef} type="file" accept=".pdf" onChange={(e) => uploadFile(e.target.files[0])}
              onClick={(e) => e.stopPropagation()} className="hidden" />
          </div>

          {materials.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <FileText className="mx-auto mb-3 opacity-40" size={48} />
              <p>No materials yet. Upload a PDF to get started!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {materials.map((m) => (
                <div key={m.id} className="bg-white rounded-2xl p-4 shadow-card hover:shadow-card-hover transition-shadow">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-red-600">PDF</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 text-sm truncate">{m.filename}</p>
                      <p className="text-xs text-gray-400 mt-0.5">Uploaded: {formatDate(m.uploaded_at)}</p>
                      {m.topics?.length > 0 && (
                        <span className="inline-block mt-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                          {m.topics[0]}
                        </span>
                      )}
                    </div>
                    <button onClick={() => setDeleteTarget({ id: m.id, filename: m.filename })}
                      className="text-gray-300 hover:text-red-500 transition-colors p-1 shrink-0">
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <button onClick={() => navigate('/quiz', { state: { material_id: m.id } })}
                    className="w-full bg-primary-dark hover:bg-primary text-white text-sm font-semibold py-2 rounded-xl transition-colors flex items-center justify-center gap-2">
                    <Brain size={14} />
                    Generate Quiz
                  </button>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Material"
        message={`"${deleteTarget?.filename}" and all its quizzes and chat history will be permanently deleted. This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
