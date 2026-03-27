import { useState, useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import { Upload, FileText, Trash2, Calendar } from 'lucide-react'
import Sidebar from '../components/Sidebar.jsx'
import Navbar from '../components/Navbar.jsx'
import api from '../api/axios.js'
import { formatDate, formatFileSize } from '../utils/helpers.js'

export default function Resources() {
  const [materials, setMaterials] = useState([])
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef()

  const fetchMaterials = async () => {
    try {
      const res = await api.get('/api/materials')
      setMaterials(res.data)
    } catch {
      toast.error('Failed to load materials')
    }
  }

  useEffect(() => { fetchMaterials() }, [])

  const handleUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (!file.name.endsWith('.pdf')) {
      toast.error('Only PDF files are accepted')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File exceeds 10MB limit')
      return
    }

    const formData = new FormData()
    formData.append('file', file)
    setUploading(true)
    try {
      await api.post('/api/materials/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      toast.success('Material uploaded successfully!')
      fetchMaterials()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Upload failed')
    } finally {
      setUploading(false)
      fileRef.current.value = ''
    }
  }

  const handleDelete = async (id, filename) => {
    if (!confirm(`Delete "${filename}"?`)) return
    try {
      await api.delete(`/api/materials/${id}`)
      toast.success('Material deleted')
      setMaterials((prev) => prev.filter((m) => m.id !== id))
    } catch {
      toast.error('Failed to delete material')
    }
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar title="Study Materials" />
        <main className="flex-1 overflow-y-auto p-6">

          {/* Upload area */}
          <div
            onClick={() => fileRef.current.click()}
            className="border-2 border-dashed border-primary/50 bg-primary/5 rounded-xl p-10 text-center cursor-pointer hover:bg-primary/10 transition-colors mb-8"
          >
            <Upload className="mx-auto text-primary mb-3" size={40} />
            <p className="text-lg font-semibold text-gray-700">
              {uploading ? 'Uploading...' : 'Click to upload a PDF'}
            </p>
            <p className="text-sm text-gray-500 mt-1">PDF only, max 10MB</p>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf"
              onChange={handleUpload}
              onClick={(e) => e.stopPropagation()}
              className="hidden"
            />
          </div>

          {/* Materials list */}
          {materials.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FileText className="mx-auto mb-3 opacity-40" size={48} />
              <p>No materials uploaded yet. Upload a PDF to get started!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {materials.map((m) => (
                <div key={m.id} className="bg-white rounded-xl shadow-sm p-5 flex items-start gap-4">
                  <div className="p-3 bg-red-50 rounded-lg">
                    <FileText className="text-red-500" size={24} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 truncate">{m.filename}</p>
                    <p className="text-xs text-gray-500 mt-1">{formatFileSize(m.file_size)}</p>
                    <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                      <Calendar size={12} />
                      <span>{formatDate(m.uploaded_at)}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(m.id, m.filename)}
                    className="text-gray-400 hover:text-red-500 transition-colors p-1"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
