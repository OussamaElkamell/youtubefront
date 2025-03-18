
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
  };
}

export const useDashboardStats = () => {
  const { accounts } = useYouTubeAccounts();
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: async (): Promise<DashboardStats> => {
      // Define daysOfWeek outside the try/catch so it's accessible in both blocks
      const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const today = new Date();
      
      try {
        // Fetch comments data for the last 7 days
        const commentsResponse = await api.get<{ comments: any[] }>("/comments/stats");
        
        // Fetch API quota usage
        const quotaResponse = await api.get<{ quota: any }>("/accounts/quota");
        
        // Fetch schedulers summary
        const schedulersResponse = await api.get<{ schedulers: any }>("/scheduler/summary");
        
        // Process comments data for the chart
        const commentStats = daysOfWeek.map((day, index) => {
          const date = new Date();
          date.setDate(today.getDate() - (today.getDay() - index + 7) % 7);
          
          const dateStr = date.toISOString().split('T')[0];
          const dailyStats = commentsResponse.comments.find(
            stat => stat.date === dateStr
          );
          
          return {
            name: day,
            comments: dailyStats ? dailyStats.count : 0
          };
        });
        
        // Calculate active/inactive accounts
        const activeAccounts = accounts.filter(acc => acc.status === "active").length;
        const inactiveAccounts = accounts.length - activeAccounts;
        
        // Get total comments
        const totalComments = commentsResponse.comments.reduce(
          (sum, stat) => sum + stat.count, 0
        );
        
        return {
          commentStats,
          activeAccounts,
          inactiveAccounts,
          totalComments,
          apiQuotaUsage: {
            comments: quotaResponse.quota.comments || 0,
            accountManagement: quotaResponse.quota.accountManagement || 0,
            videoData: quotaResponse.quota.videoData || 0,
            total: quotaResponse.quota.total || 0,
            limit: quotaResponse.quota.limit || 10000
          },
          schedulers: {
            total: schedulersResponse.schedulers.total || 0,
            dueToday: schedulersResponse.schedulers.dueToday || 0
          }
        };
      } catch (error) {
        console.error("Failed to fetch dashboard stats:", error);
        
        // Return default values if API fails
        return {
          commentStats: daysOfWeek.map(day => ({ name: day, comments: 0 })),
          activeAccounts: accounts.filter(acc => acc.status === "active").length,
          inactiveAccounts: accounts.length - accounts.filter(acc => acc.status === "active").length,
          totalComments: 0,
          apiQuotaUsage: {
            comments: 0,
            accountManagement: 0,
            videoData: 0,
            total: 0,
            limit: 10000
          },
          schedulers: {
            total: 0,
            dueToday: 0
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
