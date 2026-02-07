import { useQuery } from "@tanstack/react-query";
import { youtubeAccountsApi } from "@/lib/api-client";

export type YouTubeAccount = {
  id: string;
  email: string;
  channelTitle?: string;
  channelId?: string;
  status: string;
  thumbnailUrl?: string;
};

export function useYouTubeAccountsSelect() {
  const accountsQuery = useQuery({
    queryKey: ['youtubeAccounts'],
    queryFn: async () => {
      const response = await youtubeAccountsApi.getAll();
      return response.accounts;
    }
  });

  return {
    accounts: accountsQuery.data || [],
    isLoading: accountsQuery.isLoading,
    error: accountsQuery.error,
  };
}
