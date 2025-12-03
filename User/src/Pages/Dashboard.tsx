// Pages/Dashboard.tsx
import { useEffect } from "react"
import { userRepo } from "../repositories/userRepo"
import { message } from "antd"
import { useAuthStore } from "@/hooks/store/authStore"

const Dashboard = () => {
  const { user, setUser, isLoading, setLoading } = useAuthStore()

  useEffect(() => {
    const fetchUser = async () => {
      if (user) {
        setLoading(false)
        return
      }

      try {
        const res = await userRepo.profile()
        setUser(res.data)
      } catch (err: any) {
        console.error("Failed to fetch user:", err)
        message.error("Failed to load user data")
        setLoading(false)
      }
    }
    fetchUser()
  }, [user, setUser, setLoading])

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Welcome back, {user.name}
        </h1>
      </div>

      {/* Attendance Component
      <Attendance userId={user.id} /> */}
    </div>
  )
}

export default Dashboard