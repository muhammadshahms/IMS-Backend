import api from "../lib/axios"

export class UserRepo {
  // Fetch all users
  async getAllUsers() {
    const response = await api.get("/api/user/signup")
    return response.data
  }

  // Add a new user
  async addUser(userData: any) {
    const response = await api.post("/api/user/signup", userData)
    return response.data
  }

  async loginUser(userData: any) {
    const response = await api.post("/api/user/login", userData)
    return response.data
  }

    async updateUser(id: string, userData: any) {
    const response = await api.put(`/api/user/update/${id}`, userData)
    return response.data
  }

  async logoutUser(){
    const response = await api.post("/api/user/logout")
    return response.data
  }

  async profile() {
    const response = await api.get("/api/user/profile")
    return response.data
  }

  async getEnums(){
    const response = await api.get("/api/user/enums")
    return response.data
  }
 
}



// Create a single instance to use everywhere
export const userRepo = new UserRepo()
