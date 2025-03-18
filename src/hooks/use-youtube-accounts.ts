
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { youtubeAccountsApi } from "@/lib/api-client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface YouTubeAccount {
  _id: string;
  email: string;
  status: "active" | "inactive" | "limited" | "banned";
  channelId?: string;
  channelTitle?: string;
  thumbnailUrl?: string;
  proxy?: string | null;
  connectedDate: string;
  google?: {
    tokenExpiry?: string;
  };
}

export const useYouTubeAccounts = () => {
  const queryClient = useQueryClient();
  
  // Fetch all accounts
  const { 
    data, 
    isLoading, 
    error 
  } = useQuery({
    queryKey: ['youtubeAccounts'],
    queryFn: async () => {
      const response = await youtubeAccountsApi.getAll();
      return response.accounts;
    }
  });
  
  const accounts = data || [];
  
  // Add a new account
  const addAccountMutation = useMutation({
    mutationFn: (accountData: {
      accessToken: string;
      refreshToken: string;
      email: string;
      proxy?: string;
    }) => youtubeAccountsApi.add(accountData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['youtubeAccounts'] });
    },
    onError: (error: Error) => {
      toast.error("Failed to add account", {
        description: error.message,
      });
    }
  });
  
  // Update an account
  const updateAccountMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<YouTubeAccount> }) => 
      youtubeAccountsApi.update(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['youtubeAccounts'] });
    },
    onError: (error: Error) => {
      toast.error("Failed to update account", {
        description: error.message,
      });
    }
  });
  
  // Delete an account
  const removeAccountMutation = useMutation({
    mutationFn: (id: string) => youtubeAccountsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['youtubeAccounts'] });
    },
    onError: (error: Error) => {
      toast.error("Failed to remove account", {
        description: error.message,
      });
    }
  });
  
  // Verify an account
  const verifyAccountMutation = useMutation({
    mutationFn: (id: string) => youtubeAccountsApi.verify(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['youtubeAccounts'] });
      toast.success(data.message, {
        description: `Channel verified: ${data.channel.title}`,
      });
    },
    onError: (error: Error) => {
      toast.error("Failed to verify account", {
        description: error.message,
      });
    }
  });
  
  // Refresh token for an account
  const refreshTokenMutation = useMutation({
    mutationFn: (id: string) => youtubeAccountsApi.refreshToken(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['youtubeAccounts'] });
      toast.success(data.message, {
        description: `Token valid until: ${new Date(data.expiresAt).toLocaleString()}`,
      });
    },
    onError: (error: Error) => {
      toast.error("Failed to refresh token", {
        description: error.message,
      });
    }
  });
  
  // Add account function
  const addAccount = (accountData: {
    accessToken: string;
    refreshToken: string;
    email: string;
    proxy?: string;
  }) => {
    addAccountMutation.mutate(accountData);
  };
  
  // Update account function
  const updateAccount = (id: string, updates: Partial<YouTubeAccount>) => {
    updateAccountMutation.mutate({ id, updates });
  };
  
  // Remove account function
  const removeAccount = (id: string) => {
    removeAccountMutation.mutate(id);
  };
  
  // Toggle account status
  const toggleAccountStatus = (id: string) => {
    const account = accounts.find(acc => acc._id === id);
    if (account) {
      const newStatus = account.status === "active" ? "inactive" : "active";
      updateAccountMutation.mutate({ 
        id, 
        updates: { status: newStatus } 
      });
    }
  };
  
  // Update account proxy
  const updateAccountProxy = (id: string, proxy: string) => {
    updateAccountMutation.mutate({ 
      id, 
      updates: { proxy: proxy || null } 
    });
  };
  
  // Verify account
  const verifyAccount = (id: string) => {
    verifyAccountMutation.mutate(id);
  };
  
  // Refresh token
  const refreshToken = (id: string) => {
    refreshTokenMutation.mutate(id);
  };
  
  // Get active accounts
  const getActiveAccounts = () => {
    return accounts.filter(account => account.status === "active");
  };
  
  // Get account by ID
  const getAccountById = (id: string) => {
    return accounts.find(account => account._id === id);
  };
  
  return {
    accounts,
    isLoading,
    error,
    addAccount,
    updateAccount,
    removeAccount,
    toggleAccountStatus,
    updateAccountProxy,
    verifyAccount,
    refreshToken,
    getActiveAccounts,
    getAccountById
  };
};
