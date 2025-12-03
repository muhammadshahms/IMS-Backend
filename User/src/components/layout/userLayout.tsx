import React from 'react'
import { SidebarInset, SidebarProvider } from '../ui/sidebar'
import { AppSidebar } from '../app-sidebar'
import { SiteHeader } from '../site-header'
import { Outlet } from 'react-router-dom'

const UserLayout = () => {
    return (
        <div>
            <SidebarProvider
                style={
                    {
                        "--sidebar-width": "calc(var(--spacing) * 72)",
                        "--header-height": "calc(var(--spacing) * 12)",
                    } as React.CSSProperties
                }
            >
                <AppSidebar variant="inset" />
                <SidebarInset>
                    <SiteHeader />
                    <Outlet />
                </SidebarInset>
            </SidebarProvider>
        </div>
    )
}

export default UserLayout
