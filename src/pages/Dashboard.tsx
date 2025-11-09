import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Calendar,
  MessageSquare,
  UserCheck,
  UserX,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useDashboardStats } from "@/hooks/use-dashboard-stats";
import { Skeleton } from "@/components/ui/skeleton";
import { useYouTubeAccounts } from "@/hooks/use-youtube-accounts";
import { useState } from "react";

const Dashboard = () => {
  const { stats, isLoading,clearComments } = useDashboardStats();
  const { accounts } = useYouTubeAccounts();

  const activeAccounts = accounts.filter((acc) => acc.status === "active").length;
  const inactiveAccounts = accounts.filter((acc) => acc.status !== "active").length;
  const [isClearing, setIsClearing] = useState(false);

  
  const statCards = [
    {
      title: "Comments Posted",
      value: isLoading ? "-" : (stats?.totalComments ?? 0).toString(),
      change: "Past 7 days",
      icon: MessageSquare,
      iconClass: "text-blue-500 bg-blue-100",
    },
    {
      title: "Connected Accounts",
      value: activeAccounts.toString(),
      change: `${inactiveAccounts} inactive`,
      icon: UserCheck,
      iconClass: "text-green-500 bg-green-100",
    },
    {
      title: "Disconnected Accounts",
      value: inactiveAccounts.toString(),
      change: "Requires reconnection",
      icon: UserX,
      iconClass: "text-red-500 bg-red-100",
    },
    {
      title: "Active Planners",
      value: isLoading ? "-" : (stats?.schedulers?.total ?? 0).toString(),
      change: `${stats?.schedulers?.dueToday ?? 0} due today`,
      icon: Calendar,
      iconClass: "text-purple-500 bg-purple-100",
    },
  ];

  const quotaUsed = stats?.apiQuotaUsage?.total ?? 0;
  const quotaLimit = stats?.apiQuotaUsage?.limit ?? 10000;
  const quotaPercent = Math.min((quotaUsed / quotaLimit) * 100, 100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your YouTube Auto Commenter activity
        </p>
      </div>

      {/* Stat Cards */}
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
      <div className="flex justify-end">
        <button
          onClick={clearComments}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
        >
          Clear old posted Comments
        </button>
      </div>
      {/* Charts & API Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Comment Stats Chart */}
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
                  <BarChart data={stats?.commentStats ?? []}>
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

        {/* API Quota Usage */}
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
                <div className="pt-4 border-t">
                  <div className="flex justify-between font-medium">
                    <span>Total Used</span>
                    <span>
                      {quotaUsed.toLocaleString()} / {quotaLimit.toLocaleString()} units (
                      {Math.round(quotaPercent)}%)
                    </span>
                  </div>
                  <Progress value={quotaPercent} className="h-3 mt-2" />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* API Profiles Info */}
        <Card>
          <CardHeader>
            <CardTitle>API Profiles</CardTitle>
            <CardDescription>Statistics on your profiles</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="w-full h-8" />
                <Skeleton className="w-full h-8" />
                <Skeleton className="w-full h-8" />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Total Profiles</span>
                    <span>{stats?.apiQuotaUsage?.totalProfiles ?? 0}</span>
                  </div>
                  <Progress value={(stats?.apiQuotaUsage?.totalProfiles ?? 0) / 100} className="h-2" />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Exceeded Profiles</span>
                    <span>{stats?.apiQuotaUsage?.exceededProfiles ?? 0}</span>
                  </div>
                  <Progress value={(stats?.apiQuotaUsage?.exceededProfiles ?? 0) / 100} className="h-2" />
                </div>

                {/* Profile-wise Quota Breakdown */}
                <div className="space-y-4 mt-4">
                  <h3 className="text-sm font-medium">Profiles Quota Usage</h3>
                  <div className="space-y-2">
                    {(stats?.profiles ?? []).map((profile, index) => {
                      const used = profile.usedQuota ?? 0;
                      const total = profile.totalQuota ?? 1; // Avoid division by zero
                      const percentage = (used / total) * 100;

                      return (
                        <div key={index} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span>Profile {index + 1}</span>
                            <span>{used} / {total} units</span>
                          </div>
                          <Progress value={percentage} className="h-2" />
                        </div>
                      );
                    })}
                  </div>
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
