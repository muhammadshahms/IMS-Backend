import React, { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { message } from "antd"
import { CheckCircle2 } from "lucide-react"
import { attRepo } from "@/repositories/attRepo"

interface AttendanceData {
  status: string
  checkInTime: string | null
  checkOutTime: string | null
}


interface Props {
  userId: string
}

const MarkAttendance: React.FC<Props> = ({ userId }) => {
  const [attendance, setAttendance] = useState<AttendanceData | null>(null)
  // const [history, setHistory] = useState<HistoryRecord[]>([])
  const [isLoading, setIsLoading] = useState(false)
  // const [isHistoryLoading, setIsHistoryLoading] = useState(false)

  // ✅ Load today's attendance on mount
  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        const res = await attRepo.getTodayStatus(userId)
        setAttendance(res || null)
      } catch (err: any) {
        console.error(err)
      }
    }
    fetchAttendance()
  }, [userId])

  // ✅ Load user attendance history on mount


  const handleCheckIn = async () => {
    setIsLoading(true)
    try {
      const res = await attRepo.checkIn(userId)
      setAttendance(res.att)
      message.success("Checked in successfully!")
      // refreshHistory()
    } catch (err: any) {
      message.error(err.response?.data?.error || "Check-in failed")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCheckOut = async () => {
    setIsLoading(true)
    try {
      const res = await attRepo.checkOut(userId)
      setAttendance(res.att)
      message.success("Checked out successfully!")
      // refreshHistory()
    } catch (err: any) {
      message.error(err.response?.data?.error || "Check-out failed")
    } finally {
      setIsLoading(false)
    }
  }



  const isCheckedIn = Boolean(attendance?.checkInTime)
  const isCheckedOut = Boolean(attendance?.checkOutTime)

  return (
    <div className="flex flex-col gap-6">
      {/* ✅ Buttons Row */}
      <div className="flex gap-4 items-center">
        {/* Check In Button */}
        {!isCheckedIn && (
          <Button onClick={handleCheckIn} disabled={isLoading}>
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-300 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-300"></span>
            </span>
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin">⏳</span> Processing...
              </span>
            ) : (
              <div>Check In</div>

            )}
          </Button>
        )}

        {/* Check Out Button */}
        {isCheckedIn && !isCheckedOut && (
          <Button onClick={handleCheckOut} disabled={isLoading} className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
            </span>
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin">⏳</span> Processing...
              </span>
            ) : (
              "Check Out"
            )}
          </Button>
        )}

      

        {/* Checked Out Status */}
        {isCheckedOut && (
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle2 className="w-5 h-5" /> Checked Out
          </div>
        )}
      </div>

      {/* ✅ Status Card */}

    </div>
  )
}

export default MarkAttendance
