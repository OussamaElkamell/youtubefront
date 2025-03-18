
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Calendar, MessageSquare, UserCheck, UserX } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useDashboardStats } from "@/hooks/use-dashboard-stats";
import { Skeleton } from "@/components/ui/skeleton";
import { useYouTubeAccounts } from "@/hooks/use-youtube-accounts";

const Dashboard = () => {
  const { stats, isLoading } = useDashboardStats();
  const { accounts } = useYouTubeAccounts();

  // Create stat cards with real data
  const statCards = [
    {
      title: "Comments Posted",
      value: isLoading ? "-" : stats?.totalComments.toString() || "0",
      change: "Past 7 days",
      icon: MessageSquare,
      iconClass: "text-blue-500 bg-blue-100",
    },
    {
      title: "Connected Accounts",
      value: accounts.filter(acc => acc.status === "active").length.toString(),
      change: `${accounts.filter(acc => acc.status !== "active").length} inactive`,
      icon: UserCheck,
      iconClass: "text-green-500 bg-green-100",
    },
    {
      title: "Disconnected Accounts",
      value: accounts.filter(acc => acc.status !== "active").length.toString(),
      change: "Requires reconnection",
      icon: UserX,
      iconClass: "text-red-500 bg-red-100",
    },
    {
      title: "Active Planners",
      value: isLoading ? "-" : stats?.schedulers.total.toString() || "0",
      change: `${isLoading ? "-" : stats?.schedulers.dueToday || 0} due today`,
      icon: Calendar,
      iconClass: "text-purple-500 bg-purple-100",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your YouTube Auto Commenter activity</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, index) => (
          <Card key={index}>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                <div className={`p-2 rounded-full ${card.iconClass}`}>
                  <card.icon className="h-4 w-4" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground">{card.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Weekly Comment Activity</CardTitle>
            <CardDescription>Number of comments posted per day</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-[300px] flex items-center justify-center">
                <Skeleton className="w-full h-[250px]" />
              </div>
            ) : (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats?.commentStats || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="comments" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>YouTube API Quota Usage</CardTitle>
            <CardDescription>Daily API consumption (10,000 units limit)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="w-full h-8" />
                <Skeleton className="w-full h-8" />
                <Skeleton className="w-full h-8" />
                <Skeleton className="w-full h-10" />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Comments</span>
                    <span>{stats?.apiQuotaUsage.comments.toLocaleString()} units</span>
                  </div>
                  <Progress value={(stats?.apiQuotaUsage.comments || 0) / (stats?.apiQuotaUsage.limit || 10000) * 100} className="h-2" />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Account Management</span>
                    <span>{stats?.apiQuotaUsage.accountManagement.toLocaleString()} units</span>
                  </div>
                  <Progress value={(stats?.apiQuotaUsage.accountManagement || 0) / (stats?.apiQuotaUsage.limit || 10000) * 100} className="h-2" />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Video Data</span>
                    <span>{stats?.apiQuotaUsage.videoData.toLocaleString()} units</span>
                  </div>
                  <Progress value={(stats?.apiQuotaUsage.videoData || 0) / (stats?.apiQuotaUsage.limit || 10000) * 100} className="h-2" />
                </div>
                
                <div className="pt-4 border-t">
                  <div className="flex justify-between font-medium">
                    <span>Total Used</span>
                    <span>
                      {stats?.apiQuotaUsage.total.toLocaleString()} / {stats?.apiQuotaUsage.limit.toLocaleString()} units 
                      ({Math.round((stats?.apiQuotaUsage.total || 0) / (stats?.apiQuotaUsage.limit || 10000) * 100)}%)
                    </span>
                  </div>
                  <Progress value={(stats?.apiQuotaUsage.total || 0) / (stats?.apiQuotaUsage.limit || 10000) * 100} className="h-3 mt-2" />
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
