import { useAuth } from '../context/AuthContext.jsx'
import Sidebar from '../components/Sidebar.jsx'
import Navbar from '../components/Navbar.jsx'
import { User, Mail, Calendar, Flame, Award } from 'lucide-react'

export default function Settings() {
  const { user } = useAuth()

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar title="Settings" />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl">
            {/* Profile Info */}
            <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-800 mb-6">Profile Information</h2>
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                  <User className="text-primary" size={24} />
                  <div className="flex-1">
                    <p className="text-sm text-gray-500">Name</p>
                    <p className="font-semibold text-gray-800">{user?.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                  <Mail className="text-primary" size={24} />
                  <div className="flex-1">
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-semibold text-gray-800">{user?.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                  <Calendar className="text-primary" size={24} />
                  <div className="flex-1">
                    <p className="text-sm text-gray-500">Member Since</p>
                    <p className="font-semibold text-gray-800">
                      {new Date(user?.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Statistics */}
            <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-800 mb-6">Statistics</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-orange-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Flame className="text-orange-500" size={20} />
                    <p className="text-sm text-gray-600">Current Streak</p>
                  </div>
                  <p className="text-3xl font-bold text-orange-600">{user?.streak ?? 0} days</p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Flame className="text-purple-500" size={20} />
                    <p className="text-sm text-gray-600">Longest Streak</p>
                  </div>
                  <p className="text-3xl font-bold text-purple-600">{user?.longest_streak ?? 0} days</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Award className="text-blue-500" size={20} />
                    <p className="text-sm text-gray-600">Achievements</p>
                  </div>
                  <p className="text-3xl font-bold text-blue-600">{user?.achievements?.length ?? 0}</p>
                </div>
              </div>
            </div>

            {/* Achievements */}
            {user?.achievements && user.achievements.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
                <h2 className="text-xl font-bold text-gray-800 mb-6">Achievements</h2>
                <div className="space-y-2">
                  {user.achievements.map((achievement) => (
                    <div key={achievement} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <Award className="text-yellow-500" size={20} />
                      <span className="font-medium text-gray-700">{achievement}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Preferences */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-6">Preferences</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-800">Email Notifications</p>
                    <p className="text-sm text-gray-500">Receive updates on quizzes and achievements</p>
                  </div>
                  <input type="checkbox" defaultChecked className="w-5 h-5" />
                </div>
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-800">Dark Mode</p>
                    <p className="text-sm text-gray-500">Coming soon</p>
                  </div>
                  <input type="checkbox" disabled className="w-5 h-5 opacity-50" />
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
