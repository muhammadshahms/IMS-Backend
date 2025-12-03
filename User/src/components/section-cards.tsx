import { useEffect, useState } from "react"
import { IconTrendingDown, IconTrendingUp } from "@tabler/icons-react"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export function SectionCards() {
  const [students, setStudents] = useState(0)
  const [pm, setPm] = useState(0)
  const [projects, setProjects] = useState(0)
  const [teams, setTeams] = useState(0)

  useEffect(() => {
    // Fetch Students
    fetch("http://localhost:3000/user/signup")
      .then((res) => res.json())
      .then((data) => setStudents(data.length || 0))
      .catch((err) => console.error("Students Error:", err))

    // Fetch PMs
    fetch("http://localhost:3000/admin/pm")
      .then((res) => res.json())
      .then((data) => setPm(data.length || 0))
      .catch((err) => console.error("PM Error:", err))

    // Fetch Projects
    fetch("http://localhost:3000/admin/projects")
      .then((res) => res.json())
      .then((data) => setProjects(data.length || 0))
      .catch((err) => console.error("Projects Error:", err))

    // Fetch Teams
    fetch("http://localhost:3000/admin/team")
      .then((res) => res.json())
      .then((data) => setTeams(data.length || 0))
      .catch((err) => console.error("Teams Error:", err))
  }, [])

  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      {/* Students */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Total Students</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {students}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconTrendingUp /> +12.5%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Trending up this month <IconTrendingUp className="size-4" />
          </div>
          <div className="text-muted-foreground">
            Visitors for the last 6 months
          </div>
        </CardFooter>
      </Card>

      {/* PM */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Total PM</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {pm}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconTrendingDown /> -20%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Down 20% this period <IconTrendingDown className="size-4" />
          </div>
          <div className="text-muted-foreground">
            Acquisition needs attention
          </div>
        </CardFooter>
      </Card>

      {/* Projects */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Total Active Projects</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {projects}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconTrendingUp /> +12.5%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Strong user retention <IconTrendingUp className="size-4" />
          </div>
          <div className="text-muted-foreground">
            Engagement exceed targets
          </div>
        </CardFooter>
      </Card>

      {/* Teams */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Total Teams</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {teams}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconTrendingUp /> +4.5%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Steady performance increase <IconTrendingUp className="size-4" />
          </div>
          <div className="text-muted-foreground">
            Meets growth projections
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
