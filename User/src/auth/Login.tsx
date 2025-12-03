// auth/Login.tsx
import React, { useState } from "react"
import { message } from "antd"
import { CiUnread, CiRead } from "react-icons/ci"
import { userRepo } from "../repositories/userRepo"
import { Button } from "../components/ui/button"
import { Link, useNavigate } from "react-router-dom"
import { useAuthStore } from "@/hooks/store/authStore"
import { useAttendanceStore } from "@/hooks/store/attendanceStore"

const Login: React.FC = () => {
  const navigate = useNavigate()
  const { setUser } = useAuthStore()
  const { clearAttendance } = useAttendanceStore()
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    // Clear errors when user types
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }))
    }
  }

  const handleSubmit = async () => {
    setIsLoading(true)
    setErrors({})
    
    try {
      const data = await userRepo.loginUser(formData)
      setUser(data.user)
      clearAttendance() 
      message.success("Login successful")
      navigate("/")
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || "Login failed"
      message.error(errorMessage)
      setErrors({
        email: " ",
        password: errorMessage,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      handleSubmit()
    }
  }

  return (
    <div className="max-w-md mx-auto p-6 mt-10 rounded-lg border shadow bg-white dark:bg-neutral-900">
      <h2 className="text-2xl font-bold mb-6 text-center">Login</h2>

      <div className="space-y-5 mb-6">
        {/* Email */}
        <div>
          <label 
            htmlFor="email" 
            className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Email
          </label>
          <input
            placeholder="Enter your email"
            type="email"
            name="email"
            id="email"
            value={formData.email}
            onChange={handleChange}
            onKeyPress={handleKeyPress}
            className={`block w-full rounded-md border px-3 py-2 text-gray-900 dark:text-white dark:bg-neutral-800 
              focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none transition
              ${errors.email ? "border-red-500" : "border-gray-300 dark:border-gray-600"}`}
            autoComplete="email"
          />
          {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
        </div>

        {/* Password */}
        <div>
          <label 
            htmlFor="password" 
            className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Password
          </label>
          <div className="relative">
            <input
              placeholder="Enter your password"
              type={showPassword ? "text" : "password"}
              name="password"
              id="password"
              value={formData.password}
              onChange={handleChange}
              onKeyPress={handleKeyPress}
              className={`block w-full rounded-md border px-3 py-2 text-gray-900 dark:text-white dark:bg-neutral-800 
                focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none transition
                ${errors.password ? "border-red-500" : "border-gray-300 dark:border-gray-600"}`}
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-2.5 text-gray-500 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300 select-none"
            >
              {showPassword ? <CiUnread size={20} /> : <CiRead size={20} />}
            </button>
          </div>
          {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
        </div>
      </div>

      <Button
        className="w-full h-11 text-lg font-medium shadow-sm hover:shadow-md transition"
        onClick={handleSubmit}
        disabled={isLoading}
      >
        {isLoading ? "Logging in..." : "Login"}
      </Button>

      <p className="text-center mt-3 text-gray-600 dark:text-gray-400">
        Don't have an account?{" "}
        <Link to="/signup" className="text-blue-600 hover:text-blue-700 font-medium">
          Create Account
        </Link>
      </p>
    </div>
  )
}

export default Login