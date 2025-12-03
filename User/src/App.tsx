// App.tsx
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import SignUp from "./auth/SignUp"
import Login from "./auth/Login"
import PrivateRoute from "./auth/PrivateRoute"
import Dashboard from "./Pages/Dashboard"
import UserLayout from "./components/layout/userLayout"
import Attendance from "./Pages/Attendance"
import Posts from "./Pages/Posts"
import Profile from "./Pages/Profile"

const App = () => {
  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/signup" element={<SignUp />} />
        <Route path="/login" element={<Login />} />

        {/* Protected routes with layout */}
        <Route path="/" element={<PrivateRoute> <UserLayout /> </PrivateRoute>}>
          <Route index element={<Dashboard />} />
          
          {/* No need to pass userId prop anymore */}
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/posts" element={<Posts />} />
          <Route path="/profile" element={<Profile />} />
        </Route>

        {/* Catch all - redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}

export default App