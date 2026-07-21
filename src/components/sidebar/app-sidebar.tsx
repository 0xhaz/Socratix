"use client";

import * as React from "react";
import { IconChartBar, IconListDetails } from "@tabler/icons-react";

import { NavMain } from "@/components/sidebar/nav-main";
import { NavUser } from "@/components/sidebar/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import Link from "next/link";
import { Codesandbox } from "lucide-react";
import Logo from "public/socratix-logo.png";
import Image from "next/image";
import { usePathname } from "next/navigation";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");

  const data = {
    // Dynamic navigation based on pathname
    navMain: [
      ...(isAdmin
        ? [
          {
            title: "Tutor Dashboard",
            url: "/admin/tutor",
            icon: IconChartBar,
          },
        ]
        : []),
      {
        title: isAdmin ? "My Courses" : "Enrolled Courses",
        url: isAdmin ? "/admin/courses" : "/dashboard/enrolled-courses",
        icon: IconListDetails,
      },
    ],
  };

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <Link href="/">
                <Image src={Logo} alt="Logo" width={44} height={44} />
                <span className="text-lg font-semibold">
                  <span className="text-primary">Socratix</span>
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
