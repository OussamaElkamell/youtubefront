import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useYouTubeAccounts } from "./use-youtube-accounts";
import { useMemo } from "react";

// Define types for responses
interface Comment {
  postedAt: string;
  status: string;
}

interface Profile {
  usedQuota: number;
  isActive: boolean;
  status: string;
  name: string;
}

interface Quota {
  usedQuota: number;
  totalQuota: number;
}

interface Scheduler {
  status: string;
  schedule: { nextRun: string };
}

interface DashboardStats {
  commentStats: {
    name: string;
    comments: number;
  }[];
  totalComments: number;
  exceededProfiles: number;
  apiQuotaUsage: {
    total: number;
    limit: number;
    totalProfiles: number;
    exceededProfiles: number;
    totalUsedQuota: number;
    profiles: Array<{
      name: string;
      usedQuota: number;
      status: string;
      isActive: boolean;
    }>;
  };
  schedulers: {
    total: number;
    dueToday: number;
    running: number;
  };
  profiles?: {
    usedQuota: number;
    totalQuota: number;
  }[];
}

export const useDashboardStats = () => {
  const { accounts } = useYouTubeAccounts();

  const daysOfWeek = useMemo(() => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], []);

  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboardStats"],
    queryFn: async (): Promise<DashboardStats> => {
      const today = new Date();
      let quotaResponse: { quota: Quota };

      const apiProfilesResponse = await api.get<{ profiles: Profile[] }>("/profiles");
      const profiles = apiProfilesResponse.profiles || [];

      const totalApiProfiles = profiles.length;
      const totalUsedQuota = profiles.reduce((sum, p) => sum + (p.usedQuota || 0), 0);
      const exceededProfiles = profiles.filter(p => p.status === "exceeded").length;

      quotaResponse = await api.get<{ quota: Quota }>("/accounts/quota/quota");
      const schedulersResponse = await api.get<{ schedules: Scheduler[] }>("/scheduler");

      try {
        const commentsResponse = await api.get<{
          pagination: any;
          totalPostedLast7Days: any;
          comments: Comment[];
        }>("/comments");

        const commentsByDate: Record<string, number> = {};
        commentsResponse.comments
          .filter(comment => comment.status === "posted")
          .forEach(comment => {
            const dateStr = new Date(comment.postedAt).toISOString().split("T")[0];
            commentsByDate[dateStr] = (commentsByDate[dateStr] || 0) + 1;
          });

        const commentStats = daysOfWeek.map((day, index) => {
          const date = new Date();
          date.setDate(today.getDate() - (today.getDay() - index + 7) % 7);
          const dateStr = date.toISOString().split("T")[0];
          return {
            name: day,
            comments: commentsByDate[dateStr] || 0
          };
        });

        const totalComments = commentsResponse.pagination.totalPostedLast7Days;
        const runningSchedules = schedulersResponse.schedules.filter(
          s => s.status === "active"
        ).length;

        const profilesData = profiles.map(profile => ({
          name: profile.name,
          usedQuota: profile.usedQuota,
          status: profile.status,
          isActive: profile.isActive,
        }));

        return {
          commentStats,
          totalComments,
          exceededProfiles,
          apiQuotaUsage: {
            total: quotaResponse.quota.usedQuota ?? 0,
            limit: quotaResponse.quota.totalQuota ?? 10000,
            totalProfiles: totalApiProfiles,
            exceededProfiles,
            totalUsedQuota,
            profiles: profilesData
          },
          schedulers: {
            total: schedulersResponse.schedules.length || 0,
            dueToday: schedulersResponse.schedules.filter(
              s => new Date(s.schedule.nextRun).toDateString() === today.toDateString()
            ).length,
            running: runningSchedules
          }
        };
      } catch (error) {
        console.error("Failed to fetch dashboard stats:", error);

        return {
          commentStats: daysOfWeek.map(day => ({ name: day, comments: 0 })),
          totalComments: 0,
          exceededProfiles: 0,
          apiQuotaUsage: {
            total: 0,
            limit: 10000,
            totalProfiles: 0,
            exceededProfiles: 0,
            totalUsedQuota: 0,
            profiles: []
          },
          schedulers: {
            total: 0,
            dueToday: 0,
            running: 0
          }
        };
      }
    },
    refetchInterval: 5000
  });
  const clearCommentsMutation = useMutation({
    mutationFn: async () => {
      await api.delete("/comments"); // Your API endpoint to clear comments
    },
    onSuccess: () => {
      console.log("Comments cleared successfully!");
    },
    onError: (error) => {
      console.error("Error clearing comments:", error);
    },
  });

  // Function to trigger comment clearing
  const clearComments = () => {
    clearCommentsMutation.mutate();
  };

  return {
    stats: data,
    isLoading,
    error,
    clearComments
  };
};
