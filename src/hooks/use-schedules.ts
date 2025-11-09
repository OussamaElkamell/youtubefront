import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { schedulerApi } from "@/lib/api-client";
import { toast } from "sonner";

export type ScheduleType = {
  _id: string;
  name: string;
  status: 'active' | 'paused' | 'completed' | 'error';
  commentTemplates: string[];
  targetVideos: Array<{
    videoId: string;
    channelId?: string;
    title?: string;
    thumbnailUrl?: string;
  }>;
  targetChannels: Array<{
    channelId: string;
    name?: string;
    thumbnailUrl?: string;
    latestOnly?: boolean;
  }>;
  accountSelection: 'specific' | 'random' | 'round-robin';
  selectedAccounts: Array<{
    _id: string;
    email: string;
    channelTitle?: string;
    status: string;
  }>;
  schedule: {
    type: 'immediate' | 'once' | 'recurring' | 'interval';
    startDate?: Date;
    endDate?: Date;
    cronExpression?: string;
    interval?: {
      value: number;
      unit: 'minutes' | 'hours' | 'days';
    };
  };
  delays: {
    minDelay: number;
    maxDelay: number;
    betweenAccounts: number;
    limitComments:number;
  };
  progress: {
    totalComments: number;
    postedComments: number;
    failedComments: number;
  };
  useAI:boolean;
  createdAt: Date;
  

};

export type ScheduleFormData = {
  name: string;
  commentTemplates: string[];
  targetVideos: Array<{
    videoId: string;
    channelId?: string;
    title?: string;
    thumbnailUrl?: string;
  }>;
  targetChannels?: Array<{
    channelId: string;
    name?: string;
    thumbnailUrl?: string;
    latestOnly?: boolean;
  }>;
  accountSelection: 'specific' | 'random' | 'round-robin';
  selectedAccounts: string[];
  schedule: {
    type: 'immediate' | 'once' | 'recurring' | 'interval';
    startDate?: Date;
    endDate?: Date;
    cronExpression?: string;
    interval?: {
      value: number;
      unit: 'minutes' | 'hours' | 'days';
      minValue: number,
      maxValue:number
    };
  };
  delays: {
    minDelay: number;
    maxDelay: number;
    betweenAccounts: number;
    limitComments:number;
    minSleepComments:number
    maxSleepComments:number
  };
    useAI:boolean,
    includeEmojis:boolean,
 
};

export function useSchedules() {
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10
  });
  
  const queryClient = useQueryClient();
  
  // Fetch all schedules
  const schedulesQuery = useQuery({
    queryKey: ['schedules', pagination],
    queryFn: async () => {
      const response = await schedulerApi.getAll({
        page: pagination.page,
        limit: pagination.limit
      });
      return response;
    },
    refetchInterval: 5000,
  });
  
  // Create a new schedule
  const createScheduleMutation = useMutation({
    mutationFn: (data: ScheduleFormData) => {
      return schedulerApi.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      toast.success('Schedule created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create schedule: ${error.message}`);
    }
  });
  
  // Update a schedule
  const updateScheduleMutation = useMutation({
  mutationFn: ({ id, data }: { id: string; data: Partial<ScheduleFormData> }) => {
    // Ensure interval is always included if the schedule type is 'interval'
    if (data.schedule?.type === 'interval' && !data.schedule.interval) {
      throw new Error("Interval is required for 'interval' type schedules");
    }
    return schedulerApi.update(id, data);
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['schedules'] });
    toast.success('Schedule updated successfully');
  },
  onError: (error: Error) => {
    toast.error(`Failed to update schedule: ${error.message}`);
  }
});

  
  // Delete a schedule
  const deleteScheduleMutation = useMutation({
    mutationFn: (id: string) => {
      return schedulerApi.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      toast.success('Schedule deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete schedule: ${error.message}`);
    }
  });
  
  // Pause a schedule
  const pauseScheduleMutation = useMutation({
    mutationFn: (id: string) => {
      return schedulerApi.pause(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      toast.success('Schedule paused successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to pause schedule: ${error.message}`);
    }
  });
  
  // Resume a schedule
  const resumeScheduleMutation = useMutation({
    mutationFn: (id: string) => {
      return schedulerApi.resume(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      toast.success('Schedule resumed successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to resume schedule: ${error.message}`);
    }
  });
  
  return {
    schedules: schedulesQuery.data?.schedules || [],
    pagination: schedulesQuery.data?.pagination,
    isLoading: schedulesQuery.isLoading,
    error: schedulesQuery.error,
    setPagination,
    createSchedule: createScheduleMutation.mutate,
    updateSchedule: updateScheduleMutation.mutate,
    deleteSchedule: deleteScheduleMutation.mutate,
    pauseSchedule: pauseScheduleMutation.mutate,
    resumeSchedule: resumeScheduleMutation.mutate,
  };
}