// Pages/Dashboard.tsx
import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { userRepo } from "../repositories/userRepo"
import { attRepo } from "../repositories/attRepo"
import { postRepo } from "../repositories/postRepo"
import { likeRepo } from "../repositories/likeRepo"
import { commentRepo } from "../repositories/commentRepo"
import { useAuthStore } from "@/hooks/store/authStore"
import {
  CalendarCheck,
  Clock,
  Heart,
  MessageSquare,
  FileText,
  TrendingUp,
  CheckCircle2,
  XCircle,
  LogIn,
  LogOut,
  Megaphone
} from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
  AreaChart,
  Area
} from "recharts"

interface AttendanceRecord {
  _id: string
  createdAt: string
  checkInTime: string | null
  checkOutTime: string | null
  status: string
}

interface PostStat {
  _id: string
  title: string
  likeCount: number
  commentCount: number
  createdAt: string
}

interface AdminAnnouncement {
  _id: string
  title: string
  description: string
  createdAt: string
}

const Dashboard = () => {
  const { user, setUser, isLoading, setLoading } = useAuthStore()

  // States
  const [todayAttendance, setTodayAttendance] = useState<any>(null)
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([])
  const [myPosts, setMyPosts] = useState<PostStat[]>([])
  const [announcements, setAnnouncements] = useState<AdminAnnouncement[]>([])
  const [dashboardLoading, setDashboardLoading] = useState(true)

  // Stats
  const [totalLikes, setTotalLikes] = useState(0)
  const [totalComments, setTotalComments] = useState(0)
  const [totalPosts, setTotalPosts] = useState(0)
  const [attendanceStats, setAttendanceStats] = useState({ present: 0, absent: 0, late: 0 })

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
        setLoading(false)
      }
    }
    fetchUser()
  }, [user, setUser, setLoading])

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user?._id) return

      setDashboardLoading(true)

      try {
        // Fetch today's attendance
        const todayRes = await attRepo.getTodayStatus(user._id)
        setTodayAttendance(todayRes)

        // Fetch attendance history
        const historyRes = await attRepo.getUserHistory(user._id)
        const history = historyRes.history || []
        setAttendanceHistory(history)

        // Calculate attendance stats
        const presentCount = history.filter((h: any) => h.status === 'Present').length
        const absentCount = history.filter((h: any) => h.status === 'Absent').length
        const lateCount = history.filter((h: any) => h.status === 'Late').length
        setAttendanceStats({ present: presentCount, absent: absentCount, late: lateCount })

        // Fetch user's posts
        const postsRes = await postRepo.getAllUsersPosts(1, 100)
        const userPosts = (postsRes.data || []).filter((p: any) => p.user === user._id || p.user?._id === user._id)

        // Fetch like and comment counts for each post
        let likesTotal = 0
        let commentsTotal = 0
        const postsWithStats: PostStat[] = []

        for (const post of userPosts.slice(0, 10)) {
          try {
            const likesRes = await likeRepo.getLikesByPost(post._id, 1, 1)
            const commentsRes = await commentRepo.getCommentsByPost(post._id, 1, 1)
            const likeCount = likesRes.pagination?.totalItems || 0
            const commentCount = commentsRes.pagination?.totalItems || 0

            likesTotal += likeCount
            commentsTotal += commentCount

            postsWithStats.push({
              _id: post._id,
              title: post.title || 'Untitled',
              likeCount,
              commentCount,
              createdAt: post.createdAt
            })
          } catch (e) {
            console.error('Error fetching post stats:', e)
          }
        }

        setMyPosts(postsWithStats)
        setTotalLikes(likesTotal)
        setTotalComments(commentsTotal)
        setTotalPosts(userPosts.length)

        // Fetch admin announcements
        const announcementsRes = await postRepo.getAllPosts(1, 5)
        setAnnouncements(announcementsRes.data || [])

      } catch (err) {
        console.error("Error fetching dashboard data:", err)
      } finally {
        setDashboardLoading(false)
      }
    }

    fetchDashboardData()
  }, [user?._id])

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Chart colors
  const COLORS = ['#22c55e', '#ef4444', '#f59e0b', '#3b82f6']

  // Attendance pie data
  const attendancePieData = [
    { name: 'Present', value: attendanceStats.present, color: '#22c55e' },
    { name: 'Absent', value: attendanceStats.absent, color: '#ef4444' },
    { name: 'Late', value: attendanceStats.late, color: '#f59e0b' },
  ].filter(d => d.value > 0)

  // Post engagement chart data
  const postEngagementData = myPosts.slice(0, 5).map(post => ({
    name: post.title.length > 15 ? post.title.substring(0, 15) + '...' : post.title,
    likes: post.likeCount,
    comments: post.commentCount
  }))

  // Weekly attendance data (last 7 records)
  const weeklyAttendanceData = attendanceHistory.slice(0, 7).reverse().map(record => ({
    date: new Date(record.createdAt).toLocaleDateString('en-US', { weekday: 'short' }),
    hours: record.checkInTime && record.checkOutTime
      ? Math.round((new Date(record.checkOutTime).getTime() - new Date(record.checkInTime).getTime()) / (1000 * 60 * 60) * 10) / 10
      : 0
  }))

  const isCheckedIn = Boolean(todayAttendance?.checkInTime)
  const isCheckedOut = Boolean(todayAttendance?.checkOutTime)

  return (
    <div className="p-6 space-y-6">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Welcome back, {user.name}! 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            Here's what's happening with your account today.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isCheckedIn ? (
            <Badge variant="default" className="bg-green-500 hover:bg-green-600">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Checked In
            </Badge>
          ) : (
            <Badge variant="secondary">
              <XCircle className="w-3 h-3 mr-1" />
              Not Checked In
            </Badge>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Posts</p>
                <h3 className="text-2xl font-bold mt-1">{totalPosts}</h3>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Likes</p>
                <h3 className="text-2xl font-bold mt-1">{totalLikes}</h3>
              </div>
              <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <Heart className="h-6 w-6 text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Comments</p>
                <h3 className="text-2xl font-bold mt-1">{totalComments}</h3>
              </div>
              <div className="h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <MessageSquare className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Attendance Rate</p>
                <h3 className="text-2xl font-bold mt-1">
                  {attendanceHistory.length > 0
                    ? Math.round((attendanceStats.present / attendanceHistory.length) * 100)
                    : 0}%
                </h3>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CalendarCheck className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Attendance Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Today's Attendance
            </CardTitle>
            <CardDescription>Your check-in/check-out status for today</CardDescription>
          </CardHeader>
          <CardContent>
            {isCheckedIn ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-green-500 flex items-center justify-center">
                      <LogIn className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium">Check-in Time</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(todayAttendance.checkInTime).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <Badge variant="default" className="bg-green-500">Active</Badge>
                </div>

                {isCheckedOut && (
                  <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center">
                        <LogOut className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="font-medium">Check-out Time</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(todayAttendance.checkOutTime).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary">Completed</Badge>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Clock className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">You haven't checked in today</p>
                <p className="text-sm text-muted-foreground mt-1">Use the check-in button in the header to mark your attendance</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Attendance Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Attendance Overview
            </CardTitle>
            <CardDescription>Your attendance distribution</CardDescription>
          </CardHeader>
          <CardContent>
            {attendancePieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={attendancePieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {attendancePieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[200px]">
                <p className="text-muted-foreground">No attendance data yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Post Engagement Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5" />
            Post Engagement
          </CardTitle>
          <CardDescription>Likes and comments on your recent posts</CardDescription>
        </CardHeader>
        <CardContent>
          {postEngagementData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={postEngagementData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Bar dataKey="likes" fill="#ef4444" name="Likes" radius={[4, 4, 0, 0]} />
                <Bar dataKey="comments" fill="#8b5cf6" name="Comments" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No posts yet</p>
              <p className="text-sm text-muted-foreground mt-1">Create your first post to see engagement stats</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Weekly Hours & Announcements */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Hours Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Weekly Hours
            </CardTitle>
            <CardDescription>Hours worked in the last 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            {weeklyAttendanceData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={weeklyAttendanceData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="hours"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.3}
                    name="Hours"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[200px]">
                <p className="text-muted-foreground">No attendance data available</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Admin Announcements */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5" />
              Admin Announcements
            </CardTitle>
            <CardDescription>Latest updates from admin</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-[240px] overflow-y-auto">
              {announcements.length > 0 ? (
                announcements.map((announcement) => (
                  <div
                    key={announcement._id}
                    className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="h-8 w-8 bg-primary">
                        <AvatarFallback className="text-primary-foreground text-xs">A</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{announcement.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                          {announcement.description}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {new Date(announcement.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-8">
                  <Megaphone className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground text-sm">No announcements yet</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default Dashboard