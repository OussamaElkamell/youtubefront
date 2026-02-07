import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { viewsApi } from "@/lib/api-client";
import { toast } from "sonner";

export type ViewScheduleType = {
    id: string;
    name: string;
    status: 'active' | 'paused' | 'completed' | 'error';
    targetVideos: string[] | Array<{ videoId: string }>;
    scheduleType: 'immediate' | 'once' | 'recurring' | 'interval';
    startDate?: Date;
    endDate?: Date;
    cronExpression?: string;
    interval?: {
        value: number;
        unit: 'minutes' | 'hours' | 'days';
    };
    minWatchTime: number;
    maxWatchTime: number;
    probability: number;
    totalViews: number;
    completedViews: number;
    failedViews: number;
    createdAt: Date;
    updatedAt: Date;
    lastProcessedAt?: Date;
    autoLike: boolean;
};

export type ViewScheduleFormData = {
    name: string;
    targetVideos: string[];
    scheduleType: 'immediate' | 'once' | 'recurring' | 'interval';
    interval?: {
        value: number;
        unit: 'minutes' | 'hours' | 'days';
    };
    minWatchTime: number;
    maxWatchTime: number;
    probability: number;
    status?: string;
    autoLike: boolean;
};

export function useViews() {
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 10
    });

    const queryClient = useQueryClient();

    const viewsQuery = useQuery({
        queryKey: ['views', pagination],
        queryFn: async () => {
            const response = await viewsApi.getAll({
                page: pagination.page,
                limit: pagination.limit
            });
            return response;
        },
        refetchInterval: 5000,
    });

    const createViewMutation = useMutation({
        mutationFn: (data: ViewScheduleFormData) => viewsApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['views'] });
            toast.success('View schedule created successfully');
        },
        onError: (error: Error) => {
            toast.error(`Failed to create view schedule: ${error.message}`);
        }
    });

    const updateViewMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<ViewScheduleFormData> }) => viewsApi.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['views'] });
            toast.success('View schedule updated successfully');
        },
        onError: (error: Error) => {
            toast.error(`Failed to update view schedule: ${error.message}`);
        }
    });

    const deleteViewMutation = useMutation({
        mutationFn: (id: string) => viewsApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['views'] });
            toast.success('View schedule deleted successfully');
        },
        onError: (error: Error) => {
            toast.error(`Failed to delete view schedule: ${error.message}`);
        }
    });

    return {
        schedules: viewsQuery.data?.schedules || [],
        pagination: viewsQuery.data?.pagination,
        isLoading: viewsQuery.isLoading,
        error: viewsQuery.error,
        setPagination,
        createView: createViewMutation.mutate,
        updateView: updateViewMutation.mutate,
        deleteView: deleteViewMutation.mutate,
    };
}
