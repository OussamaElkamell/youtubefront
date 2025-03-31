import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useYouTubeAccounts } from "./use-youtube-accounts";

interface DashboardStats {
  commentStats: {
    name: string;
    comments: number;
  }[];
  activeAccounts: number;
  inactiveAccounts: number;
  totalComments: number;
  apiQuotaUsage: {
    comments: number;
    accountManagement: number;
    videoData: number;
    total: number;
    limit: number;
  };
  schedulers: {
    total: number;
    dueToday: number;
    running: number;  // Added for running schedules
  };
}

export const useDashboardStats = () => {
  const { accounts } = useYouTubeAccounts();
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: async (): Promise<DashboardStats> => {
      const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const today = new Date();
      let quotaResponse: { quota: any; };
      try {
        // Fetch comments data
        const commentsResponse = await api.get<{
          pagination: any;
          totalPostedLast7Days: any; comments: any[] 
}>("/comments");

        // Fetch API quota usage
        quotaResponse = await api.get<{ quota: any }>("/accounts/quota/quota");
        console.log("quotaResponse", quotaResponse.quota.usedQuota);
        
        // Fetch scheduler data
        const schedulersResponse = await api.get<{ schedules: any[] }>("/scheduler");

        // Process comments data
        const commentsByDate: Record<string, number> = {};
        commentsResponse.comments
          .filter(comment => comment.status === "posted")
          .forEach(comment => {
            const dateStr = new Date(comment.postedAt).toISOString().split("T")[0];
            commentsByDate[dateStr] = (commentsByDate[dateStr] || 0) + 1;
          });

        // Generate weekly comment stats
        const commentStats = daysOfWeek.map((day, index) => {
          const date = new Date();
          date.setDate(today.getDate() - (today.getDay() - index + 7) % 7);
          const dateStr = date.toISOString().split("T")[0];

          return {
            name: day,
            comments: commentsByDate[dateStr] || 0
          };
        });

        // Calculate active/inactive accounts
        const activeAccounts = accounts.filter(acc => acc.status === "active").length;
        const inactiveAccounts = accounts.length - activeAccounts;

        // Total Comments Count
        const totalComments = commentsResponse.pagination.totalPostedLast7Days;
console.log("total comments",commentsResponse);

        // Extract running schedules
        const runningSchedules = schedulersResponse.schedules.filter(schedule => schedule.status === "active").length;

        return {
          commentStats,
          activeAccounts,
          inactiveAccounts,
          totalComments,
          apiQuotaUsage: {
            comments: quotaResponse.quota.usedQuota,
            accountManagement: 0, // Add this if needed in your response
            videoData: 0, // Add this if needed in your response
            total: quotaResponse.quota.usedQuota ?? 10000,
            limit: quotaResponse.quota.totalQuota 
          },
          schedulers: {
            total: schedulersResponse.schedules.length || 0,
            dueToday: schedulersResponse.schedules.filter(s => new Date(s.schedule.nextRun).toDateString() === today.toDateString()).length,
            running: runningSchedules
          }
        };
      } catch (error) {
        console.error("Failed to fetch dashboard stats:", error);

        return {
          commentStats: daysOfWeek.map(day => ({ name: day, comments: 0 })),
          activeAccounts: accounts.filter(acc => acc.status === "active").length,
          inactiveAccounts: accounts.length - accounts.filter(acc => acc.status === "active").length,
          totalComments: 0,
          apiQuotaUsage: {
            comments: 0,
            accountManagement: 0,
            videoData: 0,
            total: quotaResponse.quota.usedQuota ?? 10000,
            limit: 10000
          },
          schedulers: {
            total: 0,
            dueToday: 0,
            running: 0
          }
        };
      }
    },
    enabled: accounts.length > 0,
  });

  return {
    stats: data,
    isLoading,
    error
  };
};
