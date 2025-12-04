import React, { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { message } from "antd"
import { CheckCircle2, Clock, Sun, Moon, AlertCircle, XCircle } from "lucide-react"
import { attRepo, AttendanceStatus, AttendanceSettings } from "@/repositories/attRepo"

interface Props {
  userId: string
}

const MarkAttendance: React.FC<Props> = ({ userId }) => {
  const [attendance, setAttendance] = useState<AttendanceStatus | null>(null)
  const [shiftInfo, setShiftInfo] = useState<AttendanceSettings | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsFetching(true)
        const [statusRes, shiftRes] = await Promise.all([
          attRepo.getTodayStatus(userId),
          attRepo.getShiftInfo()
        ])
        setAttendance(statusRes)
        setShiftInfo(shiftRes)
      } catch (err) {
        console.error("Error fetching attendance:", err)
      } finally {
        setIsFetching(false)
      }
    }
    fetchData()
  }, [userId])

  const handleCheckIn = async () => {
    setIsLoading(true)
    try {
      const res = await attRepo.checkIn(userId)
      setAttendance(prev => ({
        ...prev,
        ...res.att,
        canCheckIn: false
      }))
      message.success(res.message || "Checked in successfully!")
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
      setAttendance(prev => ({
        ...prev,
        ...res.att
      }))
      message.success(res.message || "Checked out successfully!")
    } catch (err: any) {
      message.error(err.response?.data?.error || "Check-out failed")
    } finally {
      setIsLoading(false)
    }
  }

  const isCheckedIn = Boolean(attendance?.checkInTime)
  const isCheckedOut = Boolean(attendance?.checkOutTime)
  const userShift = attendance?.userShift
  const canCheckIn = attendance?.canCheckIn ?? true
  const shiftTiming = attendance?.shiftTiming

  const getStatusColor = (status: string) => {
    if (status === 'Present') return 'bg-green-500'
    if (status.includes('Late')) return 'bg-yellow-500'
    if (status.includes('Early')) return 'bg-orange-500'
    if (status.includes('No Checkout')) return 'bg-red-500'
    if (status === 'Incomplete') return 'bg-gray-500'
    return 'bg-blue-500'
  }

  if (isFetching) {
    return <div className="text-sm text-muted-foreground">Loading...</div>
  }

  return (
    <div className="flex gap-2">
      <div className="flex gap-2 items-center">
        {/* User Shift Info */}
        {userShift && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {userShift === 'Morning' ? (
              <Sun className="w-3.5 h-3.5 text-yellow-500" />
            ) : (
              <Moon className="w-3.5 h-3.5 text-blue-500" />
            )}
            <span>{userShift} Shift</span>
            {shiftTiming && (
              <span className="text-muted-foreground">({shiftTiming.start} - {shiftTiming.end})</span>
            )}
          </div>
        )}
        {/* Warnings */}
        {!userShift && !isCheckedIn && (
          <p className="text-xs text-yellow-600">No shift assigned. Contact admin.</p>
        )}
        {userShift && !canCheckIn && !isCheckedIn && (
          <p className="text-xs text-muted-foreground">Check-in available during your shift hours</p>
        )}
      </div>
      {/* Action Buttons */}
      <div className="flex gap-2 items-center  flex-wrap">
        {!isCheckedIn && (
          <Button
            onClick={handleCheckIn}
            disabled={isLoading || !canCheckIn}
            size="sm"
            className="gap-1.5"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute h-full w-full rounded-full bg-green-300 opacity-75"></span>
              <span className="relative rounded-full h-2 w-2 bg-green-300"></span>
            </span>
            {isLoading ? "..." : "Check In"}
          </Button>
        )}

        {isCheckedIn && !isCheckedOut && (
          <Button
            onClick={handleCheckOut}
            disabled={isLoading}
            variant="destructive"
            size="sm"
            className="gap-1.5"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute h-full w-full rounded-full bg-red-300 opacity-75"></span>
              <span className="relative rounded-full h-2 w-2 bg-red-300"></span>
            </span>
            {isLoading ? "..." : "Check Out"}
          </Button>
        )}

        {/* Status Badges */}
        {isCheckedIn && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {attendance?.shift && (
              <Badge variant="outline" className="text-xs gap-1 py-0">
                {attendance.shift === 'Morning' ? <Sun className="w-3 h-3" /> : <Moon className="w-3 h-3" />}
                {attendance.shift}
              </Badge>
            )}

            {attendance?.isLate && (
              <Badge className="bg-yellow-500 text-xs py-0">
                <AlertCircle className="w-3 h-3 mr-0.5" />Late
              </Badge>
            )}

            {isCheckedOut && (
              <>
                {attendance?.isEarlyLeave && (
                  <Badge className="bg-orange-500 text-xs py-0">Early</Badge>
                )}

                <Badge className={`${getStatusColor(attendance?.status || '')} text-xs py-0`}>
                  {attendance?.status}
                </Badge>

                {attendance?.hoursWorked !== undefined && (
                  <Badge variant="outline" className="text-xs py-0 gap-1">
                    <Clock className="w-3 h-3" />
                    {attendance.hoursWorked.toFixed(1)}h
                  </Badge>
                )}
              </>
            )}

            {!isCheckedOut && attendance?.status?.includes('No Checkout') && (
              <Badge className="bg-red-500 text-xs py-0">
                <XCircle className="w-3 h-3 mr-0.5" />No Checkout
              </Badge>
            )}
          </div>
        )}

        {isCheckedOut && (
          <span className="text-green-600 text-xs flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Done
          </span>
        )}
      </div>


    </div>
  )
}

export default MarkAttendance
