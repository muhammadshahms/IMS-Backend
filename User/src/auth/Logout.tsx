import { Modal, message } from "antd"
import { userRepo } from "@/repositories/userRepo"
import { useNavigate } from "react-router-dom"

const Logout = () => {
  const navigate = useNavigate()

  const handleLogout = () => {
    Modal.confirm({
      title: "Are you sure?",
      content: "Do you really want to logout?",
      okText: "Logout",
      cancelText: "Cancel",
      onOk: async () => {
        try {
          await userRepo.logoutUser()
          message.success("Logout successful")
          navigate("/login")
        } catch (err) {
          message.error("Logout failed")
        }
      },
    })
  }

  return (
    <button id="logoutBtn" className="hidden" onClick={handleLogout}></button>
  )
}

export default Logout
