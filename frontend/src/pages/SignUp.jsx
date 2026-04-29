import { useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Lock, Mail, User, Eye, EyeOff, Leaf, ArrowLeft, RefreshCw } from 'lucide-react'
import api from '../api/axios.js'
import { useAuth } from '../context/AuthContext.jsx'
import { signInWithGoogle } from '../firebase.js'

export default function SignUp() {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [showPass, setShowPass] = useState(false)
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const otpRefs = useRef([])
  const cooldownTimer = useRef(null)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleGoogleSignUp = async () => {
    setGoogleLoading(true)
    try {
      const { idToken } = await signInWithGoogle()
      const res = await api.post('/api/auth/google', { id_token: idToken })
      login(res.data.access_token, res.data.user)
      toast.success(`Welcome to Preppal, ${res.data.user.name}!`)
      navigate('/dashboard')
    } catch (err) {
      if (err.code === 'auth/popup-closed-by-user') return
      toast.error(err.response?.data?.detail || 'Google sign-in failed')
    } finally {
      setGoogleLoading(false)
    }
  }

  const handleSendOtp = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('Please enter your name'); return }
    if (form.password.length < 6) { toast.error('Password must be at least 6 characters'); return }
    setLoading(true)
    const toastId = toast.loading('Sending verification code...')
    try {
      await api.post('/api/auth/send-otp', { email: form.email })
      toast.success(`Code sent to ${form.email}`, { id: toastId })
      setStep(2)
      startResendCooldown()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to send code', { id: toastId })
    } finally {
      setLoading(false)
    }
  }

  const startResendCooldown = () => {
    setResendCooldown(60)
    clearInterval(cooldownTimer.current)
    cooldownTimer.current = setInterval(() => {
      setResendCooldown((c) => {
        if (c <= 1) { clearInterval(cooldownTimer.current); return 0 }
        return c - 1
      })
    }, 1000)
  }

  const handleResend = async () => {
    if (resendCooldown > 0) return
    setLoading(true)
    try {
      await api.post('/api/auth/send-otp', { email: form.email })
      toast.success('New code sent!')
      startResendCooldown()
      setOtp(['', '', '', '', '', ''])
      otpRefs.current[0]?.focus()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to resend')
    } finally {
      setLoading(false)
    }
  }

  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return
    const next = [...otp]
    next[index] = value.slice(-1)
    setOtp(next)
    if (value && index < 5) otpRefs.current[index + 1]?.focus()
  }

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus()
    }
  }

  const handleOtpPaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 6) {
      setOtp(pasted.split(''))
      otpRefs.current[5]?.focus()
    }
  }

  const handleVerifyAndRegister = async (e) => {
    e.preventDefault()
    const code = otp.join('')
    if (code.length < 6) { toast.error('Enter the full 6-digit code'); return }
    setLoading(true)
    const toastId = toast.loading('Verifying...')
    try {
      await api.post('/api/auth/verify-otp', { email: form.email, code })
      toast.success('Email verified!', { id: toastId })
      const regToast = toast.loading('Creating your account...')
      const res = await api.post('/api/auth/register', form)
      login(res.data.access_token, res.data.user)
      toast.success(`Welcome to Preppal, ${res.data.user.name}!`, { id: regToast })
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Verification failed', { id: toastId })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-primary-dark via-primary to-primary-light items-center justify-center p-12">
        <div className="text-center text-white">
          <div className="flex items-center justify-center gap-3 mb-6">
            <Leaf size={36} />
            <span className="font-serif text-4xl font-bold">Preppal</span>
          </div>
          <p className="text-white/80 text-lg">Start your learning journey today</p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-8 justify-center">
            <Leaf size={24} className="text-primary" />
            <span className="font-serif text-2xl font-bold text-primary-dark">Preppal</span>
          </div>

          {/* ── STEP 1: Form ── */}
          {step === 1 && (
            <>
              <h1 className="font-serif text-3xl font-bold text-gray-800 mb-1">Create Account</h1>
              <p className="text-gray-500 text-sm mb-7">Join your AI-powered study hub</p>

              {/* Google */}
              <button type="button" onClick={handleGoogleSignUp} disabled={googleLoading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-60 mb-4">
                <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                {googleLoading ? 'Signing in...' : 'Continue with Google'}
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400">or sign up with email</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                  <div className="relative">
                    <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                      placeholder="John Doe" required />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="email" autoComplete="email" value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                      placeholder="you@example.com" required />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type={showPass ? 'text' : 'password'} autoComplete="new-password" value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      className="w-full pl-9 pr-10 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                      placeholder="Min. 6 characters" required />
                    <button type="button" onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {form.password.length > 0 && form.password.length < 6 && (
                    <p className="text-xs text-red-500 mt-1">Password must be at least 6 characters</p>
                  )}
                </div>
                <button type="submit" disabled={loading}
                  className="w-full bg-primary-dark hover:bg-primary text-white font-semibold py-3 rounded-2xl transition-colors disabled:opacity-60 text-sm mt-2">
                  {loading ? 'Sending code...' : 'Continue'}
                </button>
              </form>

              <p className="text-center text-sm text-gray-500 mt-5">
                Already have an account?{' '}
                <Link to="/signin" className="text-primary font-semibold hover:underline">Sign in</Link>
              </p>
            </>
          )}

          {/* ── STEP 2: OTP ── */}
          {step === 2 && (
            <>
              <button onClick={() => setStep(1)} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary mb-6 transition-colors">
                <ArrowLeft size={15} /> Back
              </button>

              <h1 className="font-serif text-3xl font-bold text-gray-800 mb-1">Check your email</h1>
              <p className="text-gray-500 text-sm mb-2">We sent a 6-digit code to</p>
              <p className="font-semibold text-gray-800 text-sm mb-7">{form.email}</p>

              <form onSubmit={handleVerifyAndRegister} className="space-y-6">
                <div className="flex gap-3 justify-center" onPaste={handleOtpPaste}>
                  {otp.map((digit, i) => (
                    <input key={i} ref={(el) => (otpRefs.current[i] = el)}
                      type="text" inputMode="numeric" maxLength={1} value={digit}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      className="w-12 h-14 text-center text-xl font-bold border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors" />
                  ))}
                </div>
                <button type="submit" disabled={loading || otp.join('').length < 6}
                  className="w-full bg-primary-dark hover:bg-primary text-white font-semibold py-3 rounded-2xl transition-colors disabled:opacity-60 text-sm">
                  {loading ? 'Verifying...' : 'Verify & Create Account'}
                </button>
              </form>

              <div className="text-center mt-5">
                <p className="text-sm text-gray-500">Didn't receive the code?</p>
                <button onClick={handleResend} disabled={resendCooldown > 0 || loading}
                  className="flex items-center gap-1.5 text-sm text-primary font-medium hover:underline disabled:opacity-50 mx-auto mt-1 transition-colors">
                  <RefreshCw size={13} />
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
