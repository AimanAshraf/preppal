import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import Sidebar from '../components/Sidebar.jsx'
import Navbar from '../components/Navbar.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import { User, Camera, Lock, Eye, EyeOff, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api/axios.js'
import { useNavigate } from 'react-router-dom'

export default function Settings() {
  const { user, refreshUser, logout } = useAuth()
  const navigate = useNavigate()
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [interests, setInterests] = useState([])
  const [interestInput, setInterestInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const avatarInputRef = useRef()

  // Password change
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)

  // Load current profile on mount
  useEffect(() => {
    if (user) {
      setDisplayName(user.name || '')
      setBio(user.bio || '')
      const userInterests = Array.isArray(user.interests) ? user.interests : []
      setInterests(userInterests)
      setAvatarUrl(user.avatar_url || null)
    }
  }, [user])

  const handleRemoveAvatar = async () => {
    setUploadingAvatar(true)
    try {
      await api.delete('/api/auth/avatar')
      setAvatarUrl(null)
      await refreshUser()
      toast.success('Photo removed')
    } catch {
      toast.error('Failed to remove photo')
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleAvatarChange = async (e) => {    const file = e.target.files[0]
    if (!file) return
    setUploadingAvatar(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await api.post('/api/auth/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setAvatarUrl(res.data.avatar_url)
      await refreshUser()
      toast.success('Photo updated!')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to upload photo')
    } finally {
      setUploadingAvatar(false)
      avatarInputRef.current.value = ''
    }
  }

  const removeInterest = (i) => setInterests((prev) => prev.filter((_, idx) => idx !== i))
  const addInterest = (e) => {
    if (e.key === 'Enter' && interestInput.trim()) {
      setInterests((prev) => [...prev, interestInput.trim()])
      setInterestInput('')
    }
  }

  const handleSave = async () => {
    if (!displayName.trim()) { toast.error('Name cannot be empty'); return }
    setSaving(true)
    try {
      await api.put('/api/auth/profile', {
        name: displayName.trim(),
        bio,
        interests,
      })
      await refreshUser()
      toast.success('Profile saved!')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) { toast.error('Fill in both password fields'); return }
    if (newPassword.length < 6) { toast.error('New password must be at least 6 characters'); return }
    setChangingPassword(true)
    try {
      await api.put('/api/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
      })
      toast.success('Password changed!')
      setCurrentPassword('')
      setNewPassword('')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to change password')
    } finally {
      setChangingPassword(false)
    }
  }

  const handleDeleteAccount = async () => {
    setDeleting(true)
    try {
      await api.delete('/api/auth/account')
      logout()
      toast.success('Account deleted')
      navigate('/signin')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to delete account')
      setDeleting(false)
    }
  }

  return (
    <div className="flex h-screen bg-cream overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-6">
          <h1 className="font-serif text-3xl font-bold text-gray-800 mb-6">Settings</h1>

          <div className="flex justify-center">
            <div className="w-full max-w-2xl space-y-4">

              {/* Profile card */}
              <div className="bg-white rounded-2xl p-6 shadow-card">
                <h2 className="font-semibold text-gray-800 mb-5">Edit Profile</h2>

                {/* Avatar */}
                <div className="flex items-center gap-5 mb-6">
                  <div className="relative">
                    {avatarUrl ? (
                      <img src={`http://127.0.0.1:8000${avatarUrl}`} alt="avatar"
                        className="w-20 h-20 rounded-full object-cover" />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
                        <User size={32} className="text-primary" />
                      </div>
                    )}
                    <button onClick={() => avatarInputRef.current.click()}
                      className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center hover:bg-primary-dark transition-colors">
                      <Camera size={12} className="text-white" />
                    </button>
                  </div>
                  <div>
                    <button onClick={() => avatarInputRef.current.click()} disabled={uploadingAvatar}
                      className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-cream transition-colors disabled:opacity-60">
                      {uploadingAvatar ? 'Uploading...' : 'Upload Photo'}
                    </button>
                    {avatarUrl && (
                      <button onClick={handleRemoveAvatar} disabled={uploadingAvatar}
                        className="ml-2 px-4 py-2 border border-red-200 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-colors disabled:opacity-60">
                        Remove
                      </button>
                    )}
                    <p className="text-xs text-gray-400 mt-1">JPEG, PNG or WebP · max 2MB</p>
                  </div>
                  <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/webp"
                    onChange={handleAvatarChange} className="hidden" />
                </div>

                {/* Fields */}
                <div className="grid grid-cols-2 gap-4 mb-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Display Name</label>
                    <input value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                    <input value={user?.email || ''} disabled
                      className="w-full border border-gray-100 rounded-xl px-3 py-2 text-sm bg-gray-50 text-gray-400" />
                  </div>
                </div>

                <div className="mb-5">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Bio</label>
                  <textarea value={bio} onChange={(e) => setBio(e.target.value.slice(0, 250))}
                    rows={3} placeholder="Tell us about yourself..."
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
                  <p className="text-xs text-gray-400 text-right mt-0.5">{bio.length} / 250</p>
                </div>

                {/* Study interests */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Study Interests</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {interests.map((interest, i) => (
                      <span key={i} className="flex items-center gap-1.5 bg-cream px-3 py-1 rounded-full text-sm text-gray-700">
                        {interest}
                        <button onClick={() => removeInterest(i)} className="text-gray-400 hover:text-red-500 text-xs leading-none">×</button>
                      </span>
                    ))}
                  </div>
                  <input value={interestInput} onChange={(e) => setInterestInput(e.target.value)} onKeyDown={addInterest}
                    placeholder="Type an interest and press Enter"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-100">
                  <button onClick={handleSave} disabled={saving}
                    className="px-6 py-2.5 bg-primary-dark hover:bg-primary text-white rounded-2xl text-sm font-semibold transition-colors disabled:opacity-60">
                    {saving ? 'Saving...' : 'Save Profile'}
                  </button>
                </div>
              </div>

              {/* Change password card */}
              <div className="bg-white rounded-2xl p-6 shadow-card">
                <div className="flex items-center gap-2 mb-5">
                  <Lock size={18} className="text-primary" />
                  <h2 className="font-semibold text-gray-800">Change Password</h2>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Current Password</label>
                    <div className="relative">
                      <input type={showCurrent ? 'text' : 'password'} value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                      <button type="button" onClick={() => setShowCurrent(!showCurrent)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">New Password</label>
                    <div className="relative">
                      <input type={showNew ? 'text' : 'password'} value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Min. 6 characters"
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                      <button type="button" onClick={() => setShowNew(!showNew)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4 mt-4 border-t border-gray-100">
                  <button onClick={handleChangePassword} disabled={changingPassword}
                    className="px-6 py-2.5 bg-primary-dark hover:bg-primary text-white rounded-2xl text-sm font-semibold transition-colors disabled:opacity-60">
                    {changingPassword ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
              </div>

              {/* Danger zone */}
              <div className="bg-white rounded-2xl p-6 shadow-card border border-red-100">
                <div className="flex items-center gap-2 mb-2">
                  <Trash2 size={18} className="text-red-500" />
                  <h2 className="font-semibold text-gray-800">Danger Zone</h2>
                </div>
                <p className="text-sm text-gray-500 mb-4">
                  Permanently delete your account and all associated data — materials, quizzes, chat history, and progress. This cannot be undone.
                </p>
                <button onClick={() => setShowDeleteConfirm(true)} disabled={deleting}
                  className="px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-2xl text-sm font-semibold transition-colors disabled:opacity-60">
                  {deleting ? 'Deleting...' : 'Delete My Account'}
                </button>
              </div>

            </div>
          </div>
        </main>
      </div>

      <ConfirmDialog
        open={showDeleteConfirm}
        title="Delete Account?"
        message="This will permanently delete your account, all uploaded materials, quizzes, chat history, and progress. There is no way to recover this data."
        confirmLabel="Yes, Delete Everything"
        confirmClass="bg-red-500 hover:bg-red-600"
        onConfirm={handleDeleteAccount}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  )
}
