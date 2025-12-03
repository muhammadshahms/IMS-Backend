// auth/PrivateRoute.tsx
import { Navigate } from "react-router-dom"
import { useEffect, useState } from "react"
import { userRepo } from "../repositories/userRepo"
import { useAuthStore } from "@/hooks/store/authStore"
import Loader from "@/components/Loader"

interface PrivateRouteProps {
  children: React.ReactNode
}

const PrivateRoute = ({ children }: PrivateRouteProps) => {
  const { isAuthenticated, setUser, isLoading, setLoading } = useAuthStore()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    const verifyAuth = async () => {
      if (isAuthenticated) {
        setIsChecking(false)
        return
      }

      try {
        const res = await userRepo.profile()
        setUser(res.data)
        setIsChecking(false)
      } catch (err) {
        console.error("Auth verification failed:", err)
        setLoading(false)
        setIsChecking(false)
      }
    }

    verifyAuth()
  }, [isAuthenticated, setUser, setLoading])

  if (isChecking ) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader/> 
        </div>
      </div>
    )
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

export default PrivateRoute