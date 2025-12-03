import React from "react"
import { useLocation, Link } from "react-router-dom"
import { ChevronRight } from "lucide-react"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

const UrlBreadcrumb = () => {
  const location = useLocation()
  const pathnames = location.pathname.split("/").filter((x) => x)

  return (
    <div >
      <Breadcrumb className="mb-6">
        <BreadcrumbList className="inline-flex items-center gap-2">
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/" className="font-medium text-muted-foreground hover:text-primary">
                Home
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>

          {pathnames.map((value, index) => {
            const to = `/${pathnames.slice(0, index + 1).join("/")}`
            const isLast = index === pathnames.length - 1

            return (
              <React.Fragment key={to}>
                <BreadcrumbSeparator>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </BreadcrumbSeparator>
                <BreadcrumbItem>
                  {isLast ? (
                    <span className="capitalize text-foreground font-semibold">
                      {value.replace("-", " ")}
                    </span>
                  ) : (
                    <BreadcrumbLink asChild>
                      <Link
                        to={to}
                        className="capitalize text-muted-foreground hover:text-primary transition-colors"
                      >
                        {value.replace("-", " ")}
                      </Link>
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </React.Fragment>
            )
          })}
        </BreadcrumbList>
      </Breadcrumb>
    </div>



  )
}

export default UrlBreadcrumb
