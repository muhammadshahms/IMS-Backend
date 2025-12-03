import api from "../lib/axios"

export class AttRepo {
  async checkIn(userId: string) {
    const response = await api.post(`/api/attendance/checkin/${userId}`)
    return response.data
  }

  async checkOut(userId: string) {
    const response = await api.post(`/api/attendance/checkout/${userId}`)
    return response.data
  }

  async getTodayStatus(userId: string) {
    const response = await api.get(`/api/attendance/status/${userId}`)
    return response.data
  }

  async getUserHistory(userId: string) {
    const response = await api.get(`/api/attendance/history/${userId}`)
    return response.data
  }
}

export const attRepo = new AttRepo()
