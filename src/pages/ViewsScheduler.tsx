import { useState } from "react";
import { useViews, ViewScheduleFormData } from "@/hooks/use-views";
import { Button } from "@/components/ui/button";
import { Plus, Play, Pause, Trash2, Eye, Clock, RefreshCw, ThumbsUp } from "lucide-react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Progress } from "@/components/ui/progress";

const viewFormSchema = z.object({
    name: z.string().min(3, "Name must be at least 3 characters"),
    targetVideos: z.string().min(1, "At least one video ID is required"),
    minWatchTime: z.number().min(2, "Minimum watch time is 2 seconds"),
    maxWatchTime: z.number().min(2, "Maximum watch time is 2 seconds"),
    probability: z.number().min(1).max(100),
    interval: z.number().min(1, "Interval must be at least 1 minute"),
    autoLike: z.boolean().default(false),
});

const ViewsScheduler = () => {
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const { schedules, isLoading, createView, updateView, deleteView } = useViews();

    const form = useForm<z.infer<typeof viewFormSchema>>({
        resolver: zodResolver(viewFormSchema),
        defaultValues: {
            name: "",
            targetVideos: "",
            minWatchTime: 60,
            maxWatchTime: 300,
            probability: 100,
            interval: 60,
            autoLike: false,
        },
    });

    const onSubmit = (data: z.infer<typeof viewFormSchema>) => {
        const targetVideosArray = data.targetVideos.split(",").map(id => id.trim()).filter(id => id);

        createView({
            name: data.name,
            targetVideos: targetVideosArray,
            scheduleType: 'interval',
            interval: { value: data.interval, unit: 'minutes' },
            minWatchTime: data.minWatchTime * 1000,
            maxWatchTime: data.maxWatchTime * 1000,
            probability: data.probability,
            autoLike: data.autoLike,
        });

        setIsCreateOpen(false);
        form.reset();
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "active":
                return <Badge className="bg-green-500">Active</Badge>;
            case "paused":
                return <Badge variant="secondary">Paused</Badge>;
            case "completed":
                return <Badge variant="outline" className="text-blue-500 border-blue-500">Completed</Badge>;
            case "error":
                return <Badge variant="destructive">Error</Badge>;
            default:
                return <Badge variant="secondary">{status}</Badge>;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-white">Views Scheduler</h1>
                    <p className="text-gray-400">Manage automated video views</p>
                </div>
                <Button onClick={() => setIsCreateOpen(true)} className="bg-youtube-red hover:bg-red-700">
                    <Plus className="mr-2 h-4 w-4" /> Create View Schedule
                </Button>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {isLoading ? (
                    <div className="flex justify-center py-12">
                        <RefreshCw className="h-8 w-8 animate-spin text-gray-500" />
                    </div>
                ) : schedules.length === 0 ? (
                    <Card className="bg-gray-900 border-gray-800">
                        <CardContent className="flex flex-col items-center justify-center py-12">
                            <Eye className="h-12 w-12 text-gray-700 mb-4" />
                            <p className="text-gray-500 text-lg">No view schedules found</p>
                            <Button
                                variant="outline"
                                className="mt-4 border-gray-700 text-gray-400 hover:text-white"
                                onClick={() => setIsCreateOpen(true)}
                            >
                                Create your first schedule
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    schedules.map((schedule: any) => (
                        <Card key={schedule.id} className="bg-gray-900 border-gray-800 text-white overflow-hidden">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-3">
                                        <CardTitle className="text-xl font-bold">{schedule.name}</CardTitle>
                                        {getStatusBadge(schedule.status)}
                                    </div>
                                    <CardDescription className="text-gray-400">
                                        Created on {new Date(schedule.createdAt).toLocaleDateString()}
                                    </CardDescription>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-gray-400 hover:text-white"
                                        onClick={() => updateView({
                                            id: schedule.id,
                                            data: { status: schedule.status === 'active' ? 'paused' : 'active' }
                                        })}
                                    >
                                        {schedule.status === 'active' ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-gray-400 hover:text-youtube-red"
                                        onClick={() => deleteView(schedule.id)}
                                    >
                                        <Trash2 className="h-5 w-5" />
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-4">
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 text-gray-400">
                                            <Clock className="h-4 w-4" />
                                            <span>Interval: {schedule.interval?.value} {schedule.interval?.unit}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-gray-400">
                                            <Eye className="h-4 w-4" />
                                            <span>Videos: {Array.isArray(schedule.targetVideos) ? schedule.targetVideos.length : 0}</span>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-gray-400 text-sm">Progress</span>
                                            <div className="flex justify-between text-sm mb-1">
                                                <span>{schedule.completedViews} views</span>
                                            </div>
                                            <Progress value={100} className="h-1 bg-gray-800" />
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            Last processed: {schedule.lastProcessedAt ? new Date(schedule.lastProcessedAt).toLocaleString() : 'Never'}
                                        </div>
                                    </div>

                                    <div className="space-y-2 bg-black/30 p-3 rounded-lg border border-gray-800">
                                        <div className="text-xs font-semibold uppercase text-gray-500">Watch Settings</div>
                                        <div className="text-sm">Range: {schedule.minWatchTime / 1000}-{schedule.maxWatchTime / 1000}s</div>
                                        <div className="text-sm">Probability: {schedule.probability}%</div>
                                        {schedule.autoLike && (
                                            <div className="flex items-center gap-1 text-green-400 text-xs mt-1">
                                                <ThumbsUp className="h-3 w-3" />
                                                <span>Auto-Like Enabled</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Create View Schedule</DialogTitle>
                        <DialogDescription className="text-gray-400">
                            Set up automated views for your videos.
                        </DialogDescription>
                    </DialogHeader>

                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Schedule Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="E.g., Daily Engagement Boost" {...field} className="bg-gray-800 border-gray-700" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="interval"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Interval (min)</FormLabel>
                                            <FormControl>
                                                <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} className="bg-gray-800 border-gray-700" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="probability"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Probability (%)</FormLabel>
                                            <FormControl>
                                                <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} className="bg-gray-800 border-gray-700" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="minWatchTime"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Min Watch Time (sec)</FormLabel>
                                            <FormControl>
                                                <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} className="bg-gray-800 border-gray-700" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="maxWatchTime"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Max Watch Time (sec)</FormLabel>
                                            <FormControl>
                                                <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} className="bg-gray-800 border-gray-700" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <FormField
                                control={form.control}
                                name="targetVideos"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Target Video IDs (comma-separated)</FormLabel>
                                        <FormControl>
                                            <Input placeholder="videoId1, videoId2, ..." {...field} className="bg-gray-800 border-gray-700" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="autoLike"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border border-gray-800 p-4">
                                        <div className="space-y-0.5">
                                            <FormLabel className="text-base">Auto-Like Video</FormLabel>
                                            <div className="text-[0.8rem] text-gray-400">
                                                Automatically click the like button during simulation.
                                            </div>
                                        </div>
                                        <FormControl>
                                            <Switch
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />

                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)} className="border-gray-700 text-gray-400">
                                    Cancel
                                </Button>
                                <Button type="submit" className="bg-youtube-red hover:bg-red-700">
                                    Create Schedule
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default ViewsScheduler;
