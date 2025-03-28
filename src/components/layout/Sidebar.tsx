
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, Calendar, Youtube } from "lucide-react";
import {
  Sidebar as SidebarComponent,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

const Sidebar = () => {
  const location = useLocation();
  
  const menuItems = [
    {
      title: "Dashboard",
      icon: LayoutDashboard,
      path: "/",
    },
    {
      title: "YouTube Accounts",
      icon: Users,
      path: "/accounts",
    },
    {
      title: "Comment Scheduler",
      icon: Calendar,
      path: "/scheduler",
    },
  ];

  return (
    <SidebarComponent>
      <div className="py-4 px-3 flex justify-center">
        <div className="flex items-center gap-2">
          <Youtube className="h-6 w-6 text-youtube-red" />
          <span className="font-bold text-lg text-white">YT Commenter</span>
        </div>
      </div>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    className={cn(
                      location.pathname === item.path && "bg-sidebar-accent text-sidebar-accent-foreground"
                    )}
                  >
                    <Link to={item.path}>
                      <item.icon className="h-5 w-5" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </SidebarComponent>
  );
};

export default Sidebar;
