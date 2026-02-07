import { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { Calendar as CalendarIcon, Clock, Trash2, Edit, PlayCircle, PauseCircle, Plus, AlertTriangle, CheckCircle2, XCircle, Info, Activity, Moon, RefreshCcw } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSchedules, ScheduleFormData } from "@/hooks/use-schedules";
import { useYouTubeAccountsSelect } from "@/hooks/use-youtube-accounts-select";
import SleepDelayTimer from "@/components/Customized/SleepDelayTimer";
import NextRunTimer from "@/components/Customized/NextRunTimer";
import { Switch } from "@/components/ui/switch";
import { AccountRotationSection } from "@/components/scheduler/AccountRotationSection";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { api } from "@/lib/api-client";

// Form schema
const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  commentTemplates: z.array(z.string()).optional(),
  targetVideos: z.array(z.object({
    videoId: z.string().min(1, "Video ID is required"),
    title: z.string().optional(),
    channelId: z.string().optional(),
    thumbnailUrl: z.string().optional(),
  })).min(1, "At least one video ID is required"),
  accountSelection: z.enum(["specific", "random", "round-robin"]),
  selectedAccounts: z.array(z.string()).optional(),
  scheduleType: z.enum(["immediate", "once", "recurring", "interval"]),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  cronExpression: z.string().optional(),
  intervalValue: z.number().min(0).optional(),
  minIntervalValue: z.number().min(1).optional(),
  maxIntervalValue: z.number().min(1).optional(),
  intervalUnit: z.enum(["minutes", "hours", "days"]).optional(),
  minDelay: z.number().min(0),
  maxDelay: z.number().min(0),
  limitComments: z.number().min(0),
  minSleepComments: z.number().min(0),
  maxSleepComments: z.number().min(0),
  betweenAccounts: z.number().min(0),
  includeEmojis: z.boolean().optional(),
  useAI: z.boolean(),
  enableAccountRotation: z.boolean().optional(),
  principalAccounts: z.array(z.string()).optional(),
  secondaryAccounts: z.array(z.string()).optional(),
  simulateViews: z.boolean().optional(),
  minWatchTime: z.number().min(0).optional(),
  maxWatchTime: z.number().min(0).optional(),
  viewProbability: z.number().min(0).max(100).optional(),
  isRandomInterval: z.boolean().optional(),
  isRandomSleepComments: z.boolean().optional(),

}).refine((data) => {
  // Validate min/max interval values
  if (data.scheduleType === 'interval' && data.minIntervalValue && data.maxIntervalValue) {
    return data.minIntervalValue <= data.maxIntervalValue;
  }
  return true;
}, {
  message: "Min interval must be less than or equal to max interval",
  path: ["maxIntervalValue"]
}).refine((data) => {
  // Validate min/max sleep comments
  if (data.minSleepComments !== undefined && data.maxSleepComments !== undefined) {
    return data.minSleepComments <= data.maxSleepComments;
  }
  return true;
}, {
  message: "Min sleep comments must be less than or equal to max sleep comments",
  path: ["maxSleepComments"]
}).refine((data) => {
  // Validate selectedAccounts when rotation is disabled
  if (!data.enableAccountRotation && (!data.selectedAccounts || data.selectedAccounts.length === 0)) {
    return false;
  }
  return true;
}, {
  message: "Select at least one account or enable account rotation",
  path: ["selectedAccounts"]
}).refine((data) => {
  // Validate betweenAccounts delay doesn't exceed interval / accounts
  if (data.scheduleType !== 'interval') return true;

  const value = data.minIntervalValue || data.intervalValue || 1;
  const unitSeconds = {
    minutes: 60,
    hours: 3600,
    days: 86400
  }[data.intervalUnit || 'minutes'];
  const intervalSeconds = value * unitSeconds;

  let numAccounts = 0;
  if (data.enableAccountRotation) {
    const principalCount = data.principalAccounts?.length || 0;
    const secondaryCount = data.secondaryAccounts?.length || 0;
    numAccounts = Math.max(principalCount, secondaryCount);
  } else {
    numAccounts = data.accountSelection === 'specific' ? (data.selectedAccounts?.length || 0) : 1;
  }

  if (numAccounts <= 1) return true;

  const maxPossibleDelay = Math.floor(intervalSeconds / numAccounts);
  return data.betweenAccounts <= maxPossibleDelay;
}, (data) => {
  const value = data.minIntervalValue || data.intervalValue || 1;
  const unitSeconds = { minutes: 60, hours: 3600, days: 86400 }[data.intervalUnit || 'minutes'];
  const intervalSeconds = value * unitSeconds;

  let numAccounts = 0;
  if (data.enableAccountRotation) {
    numAccounts = Math.max(data.principalAccounts?.length || 0, data.secondaryAccounts?.length || 0);
  } else {
    numAccounts = data.accountSelection === 'specific' ? (data.selectedAccounts?.length || 0) : 1;
  }

  const max = Math.floor(intervalSeconds / numAccounts);

  return {
    message: `Delay must be ≤ ${max}s (Capped by Interval/Accounts: ${intervalSeconds}s / ${numAccounts})`,
    path: ["betweenAccounts"]
  };
});

const CommentScheduler = () => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);
  const [selectedSchedule, setSelectedSchedule] = useState<any>(null);
  const [videoInput, setVideoInput] = useState("");
  const [videoTitle, setVideoTitle] = useState("");
  const [commentInput, setCommentInput] = useState("");
  const [useAI, setUseAI] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isCompleteDialogOpen, setIsCompleteDialogOpen] = useState(false);
  const [scheduleIdToManage, setScheduleIdToManage] = useState<string | null>(null);


  const {
    schedules,
    isLoading,
    error,
    createSchedule,
    updateSchedule,
    deleteSchedule,
    pauseSchedule,
    resumeSchedule,
    completeSchedule,
    refetch
  } = useSchedules();

  const { accounts, isLoading: isLoadingAccounts } = useYouTubeAccountsSelect();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      commentTemplates: [],
      targetVideos: [],
      accountSelection: "specific",
      selectedAccounts: [],
      scheduleType: "interval",
      startDate: new Date(),
      endDate: undefined,
      cronExpression: "",
      intervalValue: 0,
      intervalUnit: "days",
      minIntervalValue: 1,
      maxIntervalValue: 2,
      minDelay: 30,
      maxDelay: 180,
      limitComments: 0,
      minSleepComments: 5,
      maxSleepComments: 10,
      betweenAccounts: 10,
      includeEmojis: false,
      useAI: false,
      enableAccountRotation: false,
      principalAccounts: [],
      secondaryAccounts: [],
      simulateViews: false,
      minWatchTime: 30,
      maxWatchTime: 120,
      viewProbability: 100,
    },
  });

  const openCreateDialog = () => {
    form.reset({
      name: "",
      commentTemplates: [],
      targetVideos: [],
      accountSelection: "specific",
      selectedAccounts: [],
      scheduleType: "interval",
      startDate: new Date(),
      endDate: undefined,
      cronExpression: "",
      intervalValue: 1,
      intervalUnit: "minutes",
      minIntervalValue: 1,
      maxIntervalValue: 2,
      minDelay: 5,
      maxDelay: 15,
      limitComments: 1,
      minSleepComments: 5,
      maxSleepComments: 10,
      betweenAccounts: 10,
      includeEmojis: false,
      useAI: false,
      enableAccountRotation: false,
      principalAccounts: [],
      secondaryAccounts: [],
      simulateViews: false,
      minWatchTime: 30,
      maxWatchTime: 120,
      viewProbability: 100,
    });
    setVideoInput("");
    setCommentInput("");
    setUseAI(false);
    setIsCreateDialogOpen(true);
  };

  const openEditDialog = (id: string) => {
    const schedule = schedules.find((s) => s.id === id);
    if (!schedule) return;

    setSelectedScheduleId(id);
    setSelectedSchedule(schedule);

    // Helper function: safely extract account IDs from either objects or strings
    const extractIds = (arr: any[] = []) =>
      arr.map(acc => (typeof acc === "string" ? acc : acc?.id)).filter(Boolean);

    // Transform the schedule data to match form structure
    form.reset({
      name: schedule.name || "",
      commentTemplates: schedule.commentTemplates || [],
      targetVideos: schedule.targetVideos || [],
      accountSelection: schedule.accountSelection || "specific",
      selectedAccounts: (schedule.selectedAccounts || []).map(acc =>
        typeof acc === "string" ? acc : acc.id
      ),
      scheduleType: schedule.scheduleType || "interval",
      startDate: schedule.startDate
        ? new Date(schedule.startDate)
        : undefined,
      endDate: schedule.endDate
        ? new Date(schedule.endDate)
        : undefined,
      cronExpression: schedule.cronExpression || "",
      intervalValue: schedule.interval?.value || 1,
      intervalUnit: schedule.interval?.unit || "minutes",
      minIntervalValue: schedule.interval?.minValue || 1,
      maxIntervalValue: schedule.interval?.maxValue || 2,
      isRandomInterval: !!schedule.interval?.isRandom,
      minDelay: schedule.minDelay || 0,
      maxDelay: schedule.maxDelay || 0,
      limitComments:
        typeof schedule.limitComments === "object"
          ? schedule.limitComments.value
          : schedule.limitComments || 0,
      minSleepComments:
        typeof schedule.limitComments === "object"
          ? schedule.limitComments.min
          : 5,
      maxSleepComments:
        typeof schedule.limitComments === "object"
          ? schedule.limitComments.max
          : 10,
      betweenAccounts: schedule.betweenAccounts || 0,
      includeEmojis: !!schedule.includeEmojis,
      useAI: !!schedule.useAI,
      enableAccountRotation: schedule.accountRotation?.enabled || false,
      principalAccounts: extractIds(schedule.accountCategories?.principal),
      secondaryAccounts: extractIds(schedule.accountCategories?.secondary),
      simulateViews: !!schedule.simulateViews,
      minWatchTime: schedule.viewConfig?.minWatchTime ? schedule.viewConfig.minWatchTime / 1000 : 30,
      maxWatchTime: schedule.viewConfig?.maxWatchTime ? schedule.viewConfig.maxWatchTime / 1000 : 120,
      viewProbability: schedule.viewConfig?.probability ?? 100,
    });

    setUseAI(!!schedule.useAI);
    setIsEditDialogOpen(true);
  };


  const getLimitCommentsLabel = (schedule) => {
    if (!schedule?.limitComments) return "0";
    if (typeof schedule.limitComments === "object") {
      const { value, min, max, isRandom } = schedule.limitComments;
      if (isRandom && min != null && max != null) {
        return `${value ?? 0} (range: ${min}-${max})`;
      }
      return String(value ?? 0);
    }
    return String(schedule.limitComments);
  };

  const addVideo = () => {
    if (!videoInput.trim()) return;

    // Regular expression to extract YouTube video ID from URL
    const youtubeUrlRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|\S+?v=|\S+)?)([a-zA-Z0-9_-]{11})/;

    // Extract video IDs
    const videoIds = videoInput
      .split(/[\s,]+/)
      .map((id) => {
        const match = id.trim().match(youtubeUrlRegex);
        return match ? match[1] : null; // Return the video ID if matched
      })
      .filter(Boolean);

    const currentVideos = form.getValues('targetVideos') || [];

    // Ensure videoId is required by explicitly setting it in each new video object
    const newVideos = videoIds
      .filter(id => !currentVideos.some(v => v.videoId === id))
      .map(id => ({
        videoId: id // Make sure videoId is explicitly set
      }));

    if (newVideos.length > 0) {
      form.setValue('targetVideos', [...currentVideos, ...newVideos]);
      setVideoInput("");
    }
  };


  const removeVideo = (videoId: string) => {
    const currentVideos = form.getValues('targetVideos') || [];
    form.setValue(
      'targetVideos',
      currentVideos.filter(v => v.videoId !== videoId)
    );
  };

  const addComment = () => {
    if (!commentInput.trim()) return;

    if (useAI) {
      // Save only the video title in the form
      form.setValue('useAI', true);
      setUseAI(true); // optional, in case you use it locally
      setCommentInput(""); // clear input
    } else {
      const currentComments = form.getValues('commentTemplates') || [];

      if (!currentComments.includes(commentInput.trim())) {
        form.setValue('commentTemplates', [...currentComments, commentInput.trim()]);
        setCommentInput("");
      }
    }
  };



  const removeComment = (comment: string) => {
    const currentComments = form.getValues('commentTemplates') || [];
    form.setValue(
      'commentTemplates',
      currentComments.filter(c => c !== comment)
    );
  };

  const handleSubmit = (data: z.infer<typeof formSchema>) => {
    const sanitizedTargetVideos = data.targetVideos.map(video => ({
      videoId: video.videoId,
      ...(video.title && { title: video.title }),
      ...(video.channelId && { channelId: video.channelId }),
      ...(video.thumbnailUrl && { thumbnailUrl: video.thumbnailUrl })
    }));

    const scheduleData: ScheduleFormData = {
      name: data.name,
      commentTemplates: data.commentTemplates,
      targetVideos: sanitizedTargetVideos,
      accountSelection: data.accountSelection,
      selectedAccounts: data.selectedAccounts,
      schedule: {
        type: data.scheduleType,
        startDate: data.startDate,
        endDate: data.endDate,
        cronExpression: data.cronExpression,
        interval: data.scheduleType === 'interval' ? {
          value: data.intervalValue || 0,
          unit: data.intervalUnit || 'minutes',
          minValue: data.minIntervalValue,
          maxValue: data.maxIntervalValue,
          isRandom: !!data.isRandomInterval
        } : undefined
      },
      delays: {
        minDelay: data.minDelay,
        maxDelay: data.maxDelay,
        betweenAccounts: data.betweenAccounts,
        limitComments: {
          isRandom: !!data.isRandomSleepComments,
          value: data.limitComments,
          min: data.minSleepComments,
          max: data.maxSleepComments
        },
        minSleepComments: data.minSleepComments,
        maxSleepComments: data.maxSleepComments
      },
      includeEmojis: data.includeEmojis,
      useAI: data.useAI,
      accountCategories: data.enableAccountRotation ? {
        principal: data.principalAccounts || [],
        secondary: data.secondaryAccounts || []
      } : undefined,
      accountRotation: data.enableAccountRotation ? {
        enabled: true
      } : undefined,
      simulateViews: data.simulateViews,
      viewConfig: data.simulateViews ? {
        minWatchTime: (data.minWatchTime || 30) * 1000,
        maxWatchTime: (data.maxWatchTime || 120) * 1000,
        probability: data.viewProbability ?? 100
      } : undefined
    };

    createSchedule(scheduleData);
    setIsCreateDialogOpen(false);
  };

  const handleEditSubmit = (data: z.infer<typeof formSchema>) => {
    if (!selectedScheduleId) return;

    const sanitizedTargetVideos = data.targetVideos.map(video => ({
      videoId: video.videoId,
      ...(video.title && { title: video.title }),
      ...(video.channelId && { channelId: video.channelId }),
      ...(video.thumbnailUrl && { thumbnailUrl: video.thumbnailUrl })
    }));

    const scheduleData: Partial<ScheduleFormData> = {
      name: data.name,
      commentTemplates: data.commentTemplates,
      targetVideos: sanitizedTargetVideos,
      accountSelection: data.accountSelection,
      selectedAccounts: data.selectedAccounts,
      schedule: {
        type: data.scheduleType,
        startDate: data.startDate,
        endDate: data.endDate,
        cronExpression: data.cronExpression,
        interval: data.scheduleType === 'interval' ? {
          value: data.intervalValue || 1,
          unit: data.intervalUnit || 'minutes',
          minValue: data.minIntervalValue,
          maxValue: data.maxIntervalValue,
          isRandom: !!data.isRandomInterval
        } : undefined
      },
      delays: {
        minDelay: data.minDelay,
        maxDelay: data.maxDelay,
        betweenAccounts: data.betweenAccounts,
        limitComments: {
          isRandom: !!data.isRandomSleepComments,
          value: data.limitComments,
          min: data.minSleepComments,
          max: data.maxSleepComments
        },
        minSleepComments: data.minSleepComments,
        maxSleepComments: data.maxSleepComments
      },
      includeEmojis: data.includeEmojis,
      useAI: data.useAI,
      accountCategories: data.enableAccountRotation ? {
        principal: data.principalAccounts || [],
        secondary: data.secondaryAccounts || []
      } : undefined,
      accountRotation: data.enableAccountRotation ? {
        enabled: true
      } : undefined,
      simulateViews: data.simulateViews,
      viewConfig: data.simulateViews ? {
        minWatchTime: (data.minWatchTime || 30) * 1000,
        maxWatchTime: (data.maxWatchTime || 120) * 1000,
        probability: data.viewProbability ?? 100
      } : undefined
    };

    updateSchedule({ id: selectedScheduleId, data: scheduleData });
    setIsEditDialogOpen(false);
    setSelectedScheduleId(null);
  };


  const toggleScheduleStatus = (id: string, status: string) => {
    if (status === 'active') {
      pauseSchedule(id);
    } else if (status === 'paused') {
      resumeSchedule(id);
    }
  };

  const handleDeleteSchedule = (id: string) => {
    setScheduleIdToManage(id);
    setIsDeleteDialogOpen(true);
  };

  const handleCompleteSchedule = (id: string) => {
    setScheduleIdToManage(id);
    setIsCompleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (scheduleIdToManage) {
      deleteSchedule(scheduleIdToManage);
      setIsDeleteDialogOpen(false);
      setScheduleIdToManage(null);
    }
  };

  const confirmComplete = () => {
    if (scheduleIdToManage) {
      completeSchedule(scheduleIdToManage);
      setIsCompleteDialogOpen(false);
      setScheduleIdToManage(null);
    }
  };

  const handleRetryFailed = async (id: string) => {
    try {
      const response = await api.post<{ message: string }>(`/scheduler/${id}/retry-failed`);
      toast.success("Retry initiated", {
        description: response.message || "Failed comments are being retried",
      });
      // Refresh to update counts
      refetch();
    } catch (error) {
      console.error("Failed to retry comments:", error);
      toast.error("Retry failed", {
        description: "Could not initiate retry for failed comments",
      });
    }
  };

  const toggleEmojis = () => {
    const current = form.getValues("includeEmojis") ?? false;
    form.setValue("includeEmojis", !current);
  };
  const emojisEnabled = form.watch('includeEmojis');
  // Reset schedule type fields when schedule type changes
  useEffect(() => {
    const scheduleType = form.watch('scheduleType');

    if (scheduleType === 'immediate') {
      form.setValue('startDate', undefined);
      form.setValue('endDate', undefined);
      form.setValue('cronExpression', undefined);
      form.setValue('intervalValue', undefined);
      form.setValue('intervalUnit', undefined);
      form.setValue('minIntervalValue', undefined);
      form.setValue('maxIntervalValue', undefined);
    } else if (scheduleType === 'once') {
      form.setValue('cronExpression', undefined);
      form.setValue('intervalValue', undefined);
      form.setValue('intervalUnit', undefined);
      form.setValue('minIntervalValue', undefined);
      form.setValue('maxIntervalValue', undefined);
    } else if (scheduleType === 'recurring') {
      form.setValue('intervalValue', undefined);
      form.setValue('intervalUnit', undefined);
      form.setValue('minIntervalValue', undefined);
      form.setValue('maxIntervalValue', undefined);
    } else if (scheduleType === 'interval') {
      form.setValue('cronExpression', undefined);

      if (!form.getValues('minIntervalValue')) {
        form.setValue('minIntervalValue', 1);
      }
      if (!form.getValues('maxIntervalValue')) {
        form.setValue('maxIntervalValue', 2);
      }
    }
  }, [form.watch('scheduleType')]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading schedules...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <div className="flex flex-col items-center space-y-4">
            <AlertTriangle className="h-12 w-12 text-destructive" />
            <h3 className="text-lg font-medium">Error loading schedules</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {(error as Error).message || "An unexpected error occurred."}
            </p>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Comment Scheduler</h1>
          <p className="text-muted-foreground">Plan and schedule your YouTube comments</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" /> New Schedule
        </Button>
      </div>

      {schedules.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <div className="flex flex-col items-center space-y-4">
              <Calendar className="h-12 w-12 text-muted-foreground" />
              <h3 className="text-lg font-medium">No comment schedules yet</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Create your first comment schedule to automatically post comments to YouTube videos on your schedule.
              </p>
              <Button onClick={openCreateDialog}>Create Schedule</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {schedules.map((schedule) => (
            <Card key={schedule.id} className={cn(schedule.status !== "active" && "opacity-70")}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl">{schedule.name}</CardTitle>
                    <CardDescription>
                      {schedule.startDate ?
                        `Starting ${format(new Date(schedule.startDate), "PPP 'at' h:mm a")}` :
                        schedule.scheduleType === 'immediate' ?
                          'Runs immediately' :
                          schedule.scheduleType === 'recurring' ?
                            `Runs on schedule: ${schedule.cronExpression}` :
                            schedule.scheduleType === 'interval' && schedule.interval ?
                              `Runs every ${schedule.interval.value} ${schedule.interval.unit}. 
                              Schedule Sleep: ${schedule.delayofsleep}` :
                              'Schedule configuration'

                      }</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <NextRunTimer schedule={schedule} />
                    {schedule.status === "active" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-orange-500 border-orange-200 bg-orange-50"
                        onClick={() => toggleScheduleStatus(schedule.id, schedule.status)}
                      >
                        <PauseCircle className="mr-2 h-4 w-4" /> Pause
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-500 border-green-200 bg-green-50"
                        onClick={() => toggleScheduleStatus(schedule.id, schedule.status)}
                        disabled={schedule.status === 'completed' || schedule.status === 'error'}
                      >
                        <PlayCircle className="mr-2 h-4 w-4" /> Resume
                      </Button>
                    )}
                    {schedule.status !== 'completed' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-green-600 hover:text-green-700 hover:bg-green-50"
                        onClick={() => handleCompleteSchedule(schedule.id)}
                        title="Mark as Completed"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </Button>
                    )}
                    {schedule.failedComments > 0 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        onClick={() => handleRetryFailed(schedule.id)}
                        title="Retry Failed Comments"
                      >
                        <RefreshCcw className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openEditDialog(schedule.id)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteSchedule(schedule.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible>
                  <AccordionItem value="details">
                    <AccordionTrigger className="py-2">
                      <span className="text-sm font-medium">Schedule Details</span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4 pt-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="text-sm font-medium mb-2">Comment Templates ({schedule.commentTemplates.length})</h4>
                            <div
                              className={`space-y-2 ${schedule.commentTemplates.length > 5 ? "max-h-60 overflow-y-auto" : ""
                                }`}
                            >
                              {schedule.commentTemplates.map((comment, idx) => (
                                <div key={idx} className="bg-slate-50 rounded-md p-3 text-sm">
                                  {comment}
                                </div>
                              ))}
                            </div>

                          </div>
                          <div>
                            <ul className="space-y-2 text-sm">
                              <li className="flex items-center gap-2">
                                <Info className="h-4 w-4 text-primary" />
                                <span className="font-semibold text-primary">Schedule Configuration</span>
                              </li>
                              <li className="flex items-center gap-3 pl-1">
                                <div className="flex items-center gap-2 min-w-[100px]">
                                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-muted-foreground">Type:</span>
                                </div>
                                <span className="font-medium capitalize">{schedule.scheduleType}</span>
                              </li>
                              {schedule.interval && (
                                <li className="flex items-center gap-3 pl-1">
                                  <div className="flex items-center gap-2 min-w-[100px]">
                                    <Activity className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-muted-foreground">Interval:</span>
                                  </div>
                                  <span className="font-medium">
                                    Every {schedule.interval.value || 1} {schedule.interval.unit || 'minutes'}
                                    {schedule.interval.isRandom && schedule.interval.minValue && schedule.interval.maxValue && (
                                      <span className="text-xs text-muted-foreground ml-2">
                                        (Range: {schedule.interval.minValue}-{schedule.interval.maxValue})
                                      </span>
                                    )}
                                  </span>
                                </li>
                              )}
                              <li className="flex items-start gap-3 pl-1">
                                <div className="flex items-center gap-2 min-w-[100px] mt-1">
                                  <Clock className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-muted-foreground">Delay:</span>
                                </div>
                                <div className="flex flex-col">
                                  <span className="font-medium">
                                    {schedule.minDelay === schedule.maxDelay
                                      ? `${schedule.minDelay} minutes batch delay`
                                      : `${schedule.minDelay}-${schedule.maxDelay} minutes random batch delay`
                                    }
                                  </span>
                                  <span className="text-xs text-muted-foreground">Sleep trigger: every {getLimitCommentsLabel(schedule)} comments</span>
                                </div>
                              </li>
                              {schedule.betweenAccounts > 0 && (
                                <li className="flex items-center gap-3 pl-1">
                                  <div className="flex items-center gap-2 min-w-[100px]">
                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-muted-foreground">Stagger:</span>
                                  </div>
                                  <span className="font-medium">{schedule.betweenAccounts}s between accounts</span>
                                </li>
                              )}
                              <li className="flex items-center gap-3 pl-1">
                                <div className="flex items-center gap-2 min-w-[100px]">
                                  <Clock className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-muted-foreground">Status:</span>
                                </div>
                                <SleepDelayTimer schedule={schedule} />
                              </li>
                            </ul>

                            <div className="mt-6 space-y-3">
                              <div className="flex items-center gap-2">
                                <Activity className="h-4 w-4 text-green-600" />
                                <span className="font-semibold text-green-600">Progress</span>
                              </div>

                              <div className="space-y-1">
                                <div className="flex justify-between text-xs font-medium">
                                  <span>Completion</span>
                                  <span>{schedule.postedComments} / {schedule.totalComments || 0}</span>
                                </div>
                                <Progress
                                  value={schedule.totalComments > 0 ? (schedule.postedComments / schedule.totalComments) * 100 : 0}
                                  className="h-2"
                                />
                              </div>

                              <div className="grid grid-cols-2 gap-4 mt-2">
                                <div className="bg-green-50 rounded-lg p-2 border border-green-100">
                                  <div className="flex items-center gap-1 text-[10px] text-green-600 font-bold uppercase tracking-wider">
                                    <CheckCircle2 className="h-3 w-3" />
                                    Posted
                                  </div>
                                  <div className="text-lg font-bold text-green-700">{schedule.postedComments}</div>
                                </div>
                                <div className="bg-red-50 rounded-lg p-2 border border-red-100">
                                  <div className="flex items-center gap-1 text-[10px] text-red-600 font-bold uppercase tracking-wider">
                                    <XCircle className="h-3 w-3" />
                                    Failed
                                  </div>
                                  <div className="text-lg font-bold text-red-700">{schedule.failedComments}</div>
                                </div>
                              </div>

                              <div className="flex justify-between items-center text-xs pt-1">
                                <span className="text-muted-foreground font-medium">Success Rate</span>
                                <span className={cn(
                                  "font-bold",
                                  (schedule.postedComments + schedule.failedComments) > 0
                                    ? (schedule.postedComments / (schedule.postedComments + schedule.failedComments) > 0.8 ? "text-green-600" : "text-amber-600")
                                    : "text-muted-foreground"
                                )}>
                                  {(schedule.postedComments + schedule.failedComments) > 0
                                    ? Math.round((schedule.postedComments / (schedule.postedComments + schedule.failedComments)) * 100)
                                    : 0}%
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <h4 className="text-sm font-medium">Target Videos ({schedule.targetVideos.length})</h4>
                          <div className="flex flex-wrap gap-2">
                            {schedule.targetVideos.map((video) => (
                              <div key={video.videoId} className="flex items-center rounded-md bg-secondary overflow-hidden border border-secondary">
                                <a
                                  href={`https://youtube.com/watch?v=${video.videoId}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs px-2 py-1.5 hover:bg-secondary/80 truncate max-w-[200px]"
                                  title={video.title || video.videoId}
                                >
                                  {video.title || video.videoId}
                                </a>
                                <div className="text-[10px] px-2 py-1.5 bg-background/50 border-l border-secondary-foreground/10 text-muted-foreground font-mono" title="Comments posted to this video">
                                  {schedule.videoProgress?.[video.videoId] || 0}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-medium">YouTube Accounts ({schedule.selectedAccounts.length})</h4>
                            {schedule.accountRotation?.enabled && (
                              <Badge variant={schedule.accountRotation.currentlyActive === 'principal' ? 'default' : 'secondary'}>
                                Currently: {schedule.accountRotation.currentlyActive === 'principal' ? 'Principal' : 'Secondary'}
                              </Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {schedule.selectedAccounts.map((account) => (
                              <div key={account.id} className="text-xs bg-secondary px-2 py-1 rounded">
                                {account.channelTitle || account.email}
                                {account.status !== 'active' && (
                                  <span className="ml-1 text-amber-500">({account.status})</span>
                                )}
                              </div>
                            ))}
                          </div>

                          {schedule.accountRotation?.enabled && (
                            <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md text-xs">
                              <p className="font-medium text-blue-900 mb-1">🔄 Account Rotation Enabled</p>
                              <p className="text-blue-700">
                                Principal: {schedule.accountCategories?.principal?.length || 0} •
                                Secondary: {schedule.accountCategories?.secondary?.length || 0}
                              </p>
                              {schedule.accountRotation.lastRotatedAt && (
                                <p className="text-blue-600 mt-1">
                                  Last rotated: {format(new Date(schedule.accountRotation.lastRotatedAt), "PPp")}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          ))}
        </div>
      )
      }

      {/* Create Schedule Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Create Comment Schedule</DialogTitle>
            <DialogDescription>
              Set up automated comments for YouTube videos.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[70vh] pr-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 py-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Schedule Name</FormLabel>
                      <FormControl>
                        <Input placeholder="E.g., New Video Promotion" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-2">
                  {/* Switch Section */}
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="generate-with-ai"
                      checked={useAI}
                      onCheckedChange={(checked) => {
                        setUseAI(checked);
                        form.setValue('useAI', checked); // keep form in sync
                      }}
                    />

                    <Label htmlFor="generate-with-ai">Generate with AI</Label>
                  </div>
                  {!useAI && (
                    <>
                      <FormLabel>Comment Templates</FormLabel>
                      <FormDescription>
                        Add different comment texts. One will be randomly selected for each post.
                      </FormDescription>

                      {/* Input Field */}
                      <div className="flex gap-2">
                        <Input
                          placeholder="Enter a comment template..."
                          value={commentInput}
                          onChange={(e) => setCommentInput(e.target.value)}
                        />
                        <Button type="button" onClick={addComment} variant="secondary" className="shrink-0">
                          Add
                        </Button>
                      </div>
                    </>
                  )}


                  {/* List of manual comments */}
                  {!useAI && form.getValues("commentTemplates")?.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {form.getValues("commentTemplates").map((comment, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between bg-slate-50 rounded-md p-3 text-sm"
                        >
                          <div className="flex-1 mr-2 break-all">{comment}</div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeComment(comment)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Error */}
                  {!useAI && form.formState.errors.commentTemplates && (
                    <p className="text-sm font-medium text-destructive">
                      {form.formState.errors.commentTemplates.message}
                    </p>
                  )}
                </div>



                <div className="space-y-2">
                  <FormLabel>Target YouTube Videos</FormLabel>
                  <FormDescription>
                    Add video Urls to comment on.
                  </FormDescription>



                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter video Urls separated by commas"
                      value={videoInput}
                      onChange={(e) => setVideoInput(e.target.value)}
                    />
                    <Button type="button" onClick={addVideo} variant="secondary" className="shrink-0">Add</Button>
                  </div>
                  <div className="flex items-center justify-between rounded-md border border-gray-200 bg-white p-4 shadow-sm">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Enable Emojis</label>
                      <p className="text-sm text-gray-500">Include emojis automatically in comments.</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleEmojis()}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${emojisEnabled ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                      role="switch"
                      aria-checked={emojisEnabled}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ease-in-out ${emojisEnabled ? 'translate-x-5' : 'translate-x-0'
                          }`}
                      />
                    </button>
                  </div>
                  {form.getValues('targetVideos')?.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {form.getValues('targetVideos').map((video) => (
                        <div key={video.videoId} className="flex items-center justify-between bg-slate-50 rounded-md p-3 text-sm">
                          <a
                            href={`https://youtube.com/watch?v=${video.videoId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 mr-2 hover:underline"
                          >
                            {video.title || video.videoId}
                          </a>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeVideo(video.videoId)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {form.formState.errors.targetVideos && (
                    <p className="text-sm font-medium text-destructive">
                      {form.formState.errors.targetVideos.message}
                    </p>
                  )}
                </div>

                {/* Account Rotation Section */}
                <AccountRotationSection form={form} accounts={accounts} />

                {!form.watch('enableAccountRotation') && (
                  <>
                    <FormField
                      control={form.control}
                      name="accountSelection"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Account Selection Strategy</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select strategy" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="specific">Use all selected accounts</SelectItem>
                              <SelectItem value="random">Random account from selection</SelectItem>
                              <SelectItem value="round-robin">Round-robin (one after another)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="selectedAccounts"
                      render={() => (
                        <FormItem>
                          <div className="mb-4">
                            <FormLabel>YouTube Accounts</FormLabel>
                            <FormDescription>
                              Select the accounts to post comments from.
                            </FormDescription>
                          </div>
                          {isLoadingAccounts ? (
                            <div className="text-center py-4">
                              <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
                              <p className="text-sm text-muted-foreground mt-2">Loading accounts...</p>
                            </div>
                          ) : accounts.length === 0 ? (
                            <div className="text-center py-4 border rounded-md bg-muted/50">
                              <p className="text-sm">No YouTube accounts available.</p>
                              <Button
                                variant="link"
                                className="mt-1 h-auto p-0"
                                onClick={() => window.location.href = '/accounts'}
                              >
                                Add YouTube accounts
                              </Button>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {accounts.length > 1 && (
                                <div className="flex flex-row items-start space-x-3 space-y-0 py-2 border-b mb-2">
                                  <Checkbox
                                    id="select-all-accounts"
                                    checked={
                                      accounts.filter(a => a.status === 'active').length > 0 &&
                                      accounts.filter(a => a.status === 'active').every(a =>
                                        form.watch('selectedAccounts')?.includes(a.id)
                                      )
                                    }
                                    onCheckedChange={(checked) => {
                                      const activeAccountIds = accounts
                                        .filter(a => a.status === 'active')
                                        .map(a => a.id);

                                      if (checked) {
                                        form.setValue('selectedAccounts', activeAccountIds);
                                      } else {
                                        form.setValue('selectedAccounts', []);
                                      }
                                    }}
                                  />
                                  <label
                                    htmlFor="select-all-accounts"
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                  >
                                    Select All Active Accounts
                                  </label>
                                </div>
                              )}
                              {accounts.map((account) => (
                                <FormField
                                  key={account.id}
                                  control={form.control}
                                  name="selectedAccounts"
                                  render={({ field }) => {
                                    return (
                                      <FormItem
                                        key={account.id}
                                        className="flex flex-row items-start space-x-3 space-y-0 py-1"
                                      >
                                        <FormControl>
                                          <Checkbox
                                            checked={field.value?.includes(account.id)}
                                            onCheckedChange={(checked) => {
                                              return checked
                                                ? field.onChange([...field.value, account.id])
                                                : field.onChange(
                                                  field.value?.filter(
                                                    (value) => value !== account.id
                                                  )
                                                );
                                            }}
                                            disabled={account.status !== "active"}
                                          />
                                        </FormControl>
                                        <FormLabel className="font-normal">
                                          {account.channelTitle || account.email}{" "}
                                          {account.status !== "active" && (
                                            <span className="text-muted-foreground ml-2">({account.status})</span>
                                          )}
                                        </FormLabel>
                                      </FormItem>
                                    );
                                  }}
                                />
                              ))}
                            </div>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                <FormField
                  control={form.control}
                  name="scheduleType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Schedule Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select schedule type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="interval">Interval (every X minutes/hours/days)</SelectItem>
                          <SelectItem value="immediate">Immediate (run now)</SelectItem>
                          <SelectItem value="once">One-time schedule</SelectItem>
                          <SelectItem value="recurring">Recurring (cron schedule)</SelectItem>

                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {form.watch('scheduleType') !== 'immediate' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {(form.watch('scheduleType') === 'once' || form.watch('scheduleType') === 'recurring') && (
                      <FormField
                        control={form.control}
                        name="startDate"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Start Date</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant={"outline"}
                                    className={cn(
                                      "w-full pl-3 text-left font-normal",
                                      !field.value && "text-muted-foreground"
                                    )}
                                  >
                                    {field.value ? (
                                      format(field.value, "PPP")
                                    ) : (
                                      <span>Pick a date</span>
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={field.value}
                                  onSelect={field.onChange}
                                  initialFocus
                                  className="pointer-events-auto"
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    <FormField
                      control={form.control}
                      name="endDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>End Date (Optional)</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  className={cn(
                                    "w-full pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {field.value ? (
                                    format(field.value, "PPP")
                                  ) : (
                                    <span>Pick a date</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                initialFocus
                                className="pointer-events-auto"
                              />
                            </PopoverContent>
                          </Popover>
                          <FormDescription>
                            When the schedule should automatically stop
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {form.watch('scheduleType') === 'recurring' && (
                  <FormField
                    control={form.control}
                    name="cronExpression"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cron Expression</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., 0 12 * * *" {...field} />
                        </FormControl>
                        <FormDescription>
                          Format: minute hour day-of-month month day-of-week (e.g., 0 12 * * * for daily at noon)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {form.watch('scheduleType') === 'interval' && (
                  <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <FormLabel className="text-blue-900 font-semibold flex items-center gap-2">
                          <Activity className="h-4 w-4" /> Interval Settings
                        </FormLabel>
                        <FormDescription className="text-blue-700/70">
                          Configure how often this schedule should repeat
                        </FormDescription>
                      </div>
                      <FormField
                        control={form.control}
                        name="isRandomInterval"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-2">
                            <FormLabel className="text-xs font-medium text-blue-800">Randomize</FormLabel>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                className="data-[state=checked]:bg-blue-600"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {!form.watch('isRandomInterval') ? (
                        <FormField
                          control={form.control}
                          name="intervalValue"
                          render={({ field }) => (
                            <FormItem className="md:col-span-2">
                              <FormLabel>Fixed Interval</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min={1}
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                                  className="bg-white border-blue-200 focus:ring-blue-500"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      ) : (
                        <>
                          <FormField
                            control={form.control}
                            name="minIntervalValue"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Min Interval</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min={1}
                                    {...field}
                                    onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                                    className="bg-white border-blue-200 focus:ring-blue-500"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="maxIntervalValue"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Max Interval</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min={1}
                                    {...field}
                                    onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                                    className="bg-white border-blue-200 focus:ring-blue-500"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </>
                      )}

                      <FormField
                        control={form.control}
                        name="intervalUnit"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Unit</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger className="bg-white border-blue-200">
                                  <SelectValue placeholder="Unit" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="minutes">Minutes</SelectItem>
                                <SelectItem value="hours">Hours</SelectItem>
                                <SelectItem value="days">Days</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                )}

                <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <FormLabel className="text-blue-900 font-semibold flex items-center gap-2">
                        <Moon className="h-4 w-4" /> Sleep Mode & Limits
                      </FormLabel>
                      <FormDescription className="text-blue-700/70">
                        Configure sleep duration and comment limits
                      </FormDescription>
                    </div>
                    <FormField
                      control={form.control}
                      name="isRandomSleepComments"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2">
                          <FormLabel className="text-xs font-medium text-blue-800">Randomize</FormLabel>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              className="data-[state=checked]:bg-blue-600"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {!form.watch("isRandomSleepComments") ? (
                      <FormField
                        control={form.control}
                        name="limitComments"
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel>Comments for Sleep (Fixed)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={0}
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                placeholder="0"
                                className="bg-white border-blue-200 focus:ring-blue-500"
                              />
                            </FormControl>
                            <FormDescription className="text-[10px] leading-tight mt-1">
                              Fixed number of comments before entering sleep mode.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ) : (
                      <>
                        <FormField
                          control={form.control}
                          name="minSleepComments"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Min Sleep Comments</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min={0}
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                  className="bg-white border-blue-200 focus:ring-blue-500"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="maxSleepComments"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Max Sleep Comments</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min={0}
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                  className="bg-white border-blue-200 focus:ring-blue-500"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </>
                    )}

                    {/* Force delay fields to start on the next line */}
                    <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="minDelay"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Min Delay of sleep (minutes)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={0}
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                className="bg-white border-blue-200 focus:ring-blue-500"
                              />
                            </FormControl>
                            <FormDescription>Minimum wait before sleeping</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="maxDelay"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Max Delay of sleep (minutes)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={0}
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                className="bg-white border-blue-200 focus:ring-blue-500"
                              />
                            </FormControl>
                            <FormDescription>Maximum wait before sleeping</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="betweenAccounts"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Between Accounts (seconds)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={0}
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              className="bg-white border-blue-200 focus:ring-blue-500"
                            />
                          </FormControl>
                          <FormDescription>Delay between each account</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                </div>


                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Create Schedule</Button>
                </DialogFooter>
              </form>
            </Form>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Edit Schedule Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Edit Comment Schedule</DialogTitle>
            <DialogDescription>
              Modify your automated comment schedule.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[70vh] pr-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleEditSubmit)} className="space-y-6 py-4">
                {/* Same form fields as Create dialog */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Schedule Name</FormLabel>
                      <FormControl>
                        <Input placeholder="E.g., New Video Promotion" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-2">
                  {/* Switch Section */}
                  <div className="flex items-center space-x-2">
                    <Switch id="generate-with-ai" checked={useAI} onCheckedChange={setUseAI} />
                    <Label htmlFor="generate-with-ai">Generate with AI</Label>
                  </div>
                  {!useAI && (
                    <>
                      <FormLabel>{"Comment Templates"}</FormLabel>
                      <FormDescription>

                        Add different comment texts. One will be randomly selected for each post.
                      </FormDescription>

                      {/* Input Field */}
                      <div className="flex gap-2">
                        <Input
                          placeholder="Enter a comment template..."
                          value={commentInput}
                          onChange={(e) => setCommentInput(e.target.value)}
                        />
                        <Button type="button" onClick={addComment} variant="secondary" className="shrink-0">
                          Add
                        </Button>
                      </div>

                    </>
                  )}

                  {/* List of manual comments */}
                  {!useAI && form.getValues("commentTemplates")?.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {form.getValues("commentTemplates").map((comment, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between bg-slate-50 rounded-md p-3 text-sm"
                        >
                          <div className="flex-1 mr-2 break-all">{comment}</div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeComment(comment)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Error */}
                  {!useAI && form.formState.errors.commentTemplates && (
                    <p className="text-sm font-medium text-destructive">
                      {form.formState.errors.commentTemplates.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <FormLabel>Target YouTube Videos</FormLabel>
                  <FormDescription>
                    Add video urls to comment on.
                  </FormDescription>

                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter video urls separated by commas"
                      value={videoInput}
                      onChange={(e) => setVideoInput(e.target.value)}
                    />
                    <Button type="button" onClick={addVideo} variant="secondary" className="shrink-0">Add</Button>
                  </div>

                  {form.getValues('targetVideos')?.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {form.getValues('targetVideos').map((video) => (
                        <div key={video.videoId} className="flex items-center justify-between bg-slate-50 rounded-md p-3 text-sm">
                          <a
                            href={`https://youtube.com/watch?v=${video.videoId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 mr-2 hover:underline"
                          >
                            {video.title || video.videoId}
                          </a>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeVideo(video.videoId)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {form.formState.errors.targetVideos && (
                    <p className="text-sm font-medium text-destructive">
                      {form.formState.errors.targetVideos.message}
                    </p>
                  )}
                </div>

                {/* Account Rotation Section */}
                <AccountRotationSection form={form} accounts={accounts} />

                {!form.watch('enableAccountRotation') && (
                  <>
                    <FormField
                      control={form.control}
                      name="accountSelection"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Account Selection Strategy</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select strategy" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="specific">Use all selected accounts</SelectItem>
                              <SelectItem value="random">Random account from selection</SelectItem>
                              <SelectItem value="round-robin">Round-robin (one after another)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="selectedAccounts"
                      render={() => (
                        <FormItem>
                          <div className="mb-4">
                            <FormLabel>YouTube Accounts</FormLabel>
                            <FormDescription>
                              Select the accounts to post comments from.
                            </FormDescription>
                          </div>
                          {isLoadingAccounts ? (
                            <div className="text-center py-4">
                              <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
                              <p className="text-sm text-muted-foreground mt-2">Loading accounts...</p>
                            </div>
                          ) : accounts.length === 0 ? (
                            <div className="text-center py-4 border rounded-md bg-muted/50">
                              <p className="text-sm">No YouTube accounts available.</p>
                              <Button
                                variant="link"
                                className="mt-1 h-auto p-0"
                                onClick={() => window.location.href = '/accounts'}
                              >
                                Add YouTube accounts
                              </Button>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {accounts.map((account) => (
                                <FormField
                                  key={account.id}
                                  control={form.control}
                                  name="selectedAccounts"
                                  render={({ field }) => {
                                    return (
                                      <FormItem
                                        key={account.id}
                                        className="flex flex-row items-start space-x-3 space-y-0 py-1"
                                      >
                                        <FormControl>
                                          <Checkbox
                                            checked={field.value?.includes(account.id)}
                                            onCheckedChange={(checked) => {
                                              return checked
                                                ? field.onChange([...field.value, account.id])
                                                : field.onChange(
                                                  field.value?.filter(
                                                    (value) => value !== account.id
                                                  )
                                                );
                                            }}
                                            disabled={account.status !== "active"}
                                          />
                                        </FormControl>
                                        <FormLabel className="font-normal">
                                          {account.channelTitle || account.email}{" "}
                                          {account.status !== "active" && (
                                            <span className="text-muted-foreground ml-2">({account.status})</span>
                                          )}
                                        </FormLabel>
                                      </FormItem>
                                    );
                                  }}
                                />
                              ))}
                            </div>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                <FormField
                  control={form.control}
                  name="scheduleType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Schedule Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select schedule type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="immediate">Immediate (run now)</SelectItem>
                          <SelectItem value="once">One-time schedule</SelectItem>
                          <SelectItem value="recurring">Recurring (cron schedule)</SelectItem>
                          <SelectItem value="interval">Interval (every X minutes/hours/days)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {form.watch('scheduleType') !== 'immediate' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {(form.watch('scheduleType') === 'once' || form.watch('scheduleType') === 'recurring') && (
                      <FormField
                        control={form.control}
                        name="startDate"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Start Date</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant={"outline"}
                                    className={cn(
                                      "w-full pl-3 text-left font-normal",
                                      !field.value && "text-muted-foreground"
                                    )}
                                  >
                                    {field.value ? (
                                      format(field.value, "PPP")
                                    ) : (
                                      <span>Pick a date</span>
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={field.value}
                                  onSelect={field.onChange}
                                  initialFocus
                                  className="pointer-events-auto"
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    <FormField
                      control={form.control}
                      name="endDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>End Date (Optional)</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  className={cn(
                                    "w-full pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {field.value ? (
                                    format(field.value, "PPP")
                                  ) : (
                                    <span>Pick a date</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                initialFocus
                                className="pointer-events-auto"
                              />
                            </PopoverContent>
                          </Popover>
                          <FormDescription>
                            When the schedule should automatically stop
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {form.watch('scheduleType') === 'recurring' && (
                  <FormField
                    control={form.control}
                    name="cronExpression"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cron Expression</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., 0 12 * * *" {...field} />
                        </FormControl>
                        <FormDescription>
                          Format: minute hour day-of-month month day-of-week (e.g., 0 12 * * * for daily at noon)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {form.watch('scheduleType') === 'interval' && (
                  <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <FormLabel className="text-blue-900 font-semibold flex items-center gap-2">
                          <Activity className="h-4 w-4" /> Interval Settings
                        </FormLabel>
                        <FormDescription className="text-blue-700/70">
                          Configure how often this schedule should repeat
                        </FormDescription>
                      </div>
                      <FormField
                        control={form.control}
                        name="isRandomInterval"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-2">
                            <FormLabel className="text-xs font-medium text-blue-800">Randomize</FormLabel>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                className="data-[state=checked]:bg-blue-600"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {!form.watch('isRandomInterval') ? (
                        <FormField
                          control={form.control}
                          name="intervalValue"
                          render={({ field }) => (
                            <FormItem className="md:col-span-2">
                              <FormLabel>Fixed Interval</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min={1}
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                                  className="bg-white border-blue-200 focus:ring-blue-500"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      ) : (
                        <>
                          <FormField
                            control={form.control}
                            name="minIntervalValue"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Min Interval</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min={1}
                                    {...field}
                                    onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                                    className="bg-white border-blue-200 focus:ring-blue-500"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="maxIntervalValue"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Max Interval</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min={1}
                                    {...field}
                                    onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                                    className="bg-white border-blue-200 focus:ring-blue-500"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </>
                      )}

                      <FormField
                        control={form.control}
                        name="intervalUnit"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Unit</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger className="bg-white border-blue-200">
                                  <SelectValue placeholder="Unit" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="minutes">Minutes</SelectItem>
                                <SelectItem value="hours">Hours</SelectItem>
                                <SelectItem value="days">Days</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                )}


                <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <FormLabel className="text-blue-900 font-semibold flex items-center gap-2">
                        <Moon className="h-4 w-4" /> Sleep Mode & Limits
                      </FormLabel>
                      <FormDescription className="text-blue-700/70">
                        Configure sleep duration and comment limits
                      </FormDescription>
                    </div>
                    <FormField
                      control={form.control}
                      name="isRandomSleepComments"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2">
                          <FormLabel className="text-xs font-medium text-blue-800">Randomize</FormLabel>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              className="data-[state=checked]:bg-blue-600"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {!form.watch("isRandomSleepComments") ? (
                      <FormField
                        control={form.control}
                        name="limitComments"
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel>Comments for Sleep (Fixed)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={0}
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                placeholder="0"
                                className="bg-white border-blue-200 focus:ring-blue-500"
                              />
                            </FormControl>
                            <FormDescription className="text-[10px] leading-tight mt-1">
                              Fixed number of comments before entering sleep mode.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ) : (
                      <>
                        <FormField
                          control={form.control}
                          name="minSleepComments"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Min Sleep Comments</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min={0}
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                  className="bg-white border-blue-200 focus:ring-blue-500"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="maxSleepComments"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Max Sleep Comments</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min={0}
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                  className="bg-white border-blue-200 focus:ring-blue-500"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </>
                    )}

                    {/* Force delay fields to start on the next line */}
                    <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="minDelay"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Min Delay of sleep (minutes)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={0}
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                className="bg-white border-blue-200 focus:ring-blue-500"
                              />
                            </FormControl>
                            <FormDescription>Minimum wait before sleeping</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="maxDelay"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Max Delay of sleep (minutes)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={0}
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                className="bg-white border-blue-200 focus:ring-blue-500"
                              />
                            </FormControl>
                            <FormDescription>Maximum wait before sleeping</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="betweenAccounts"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Between Accounts (seconds)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={0}
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              className="bg-white border-blue-200 focus:ring-blue-500"
                            />
                          </FormControl>
                          <FormDescription>Delay between each account</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>


                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Update Schedule</Button>
                </DialogFooter>
              </form>
            </Form>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              comment schedule and stop any associated background jobs.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Schedule
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Complete Confirmation Dialog */}
      <AlertDialog
        open={isCompleteDialogOpen}
        onOpenChange={setIsCompleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark as Completed?</AlertDialogTitle>
            <AlertDialogDescription>
              This will stop the schedule and mark it as finished. You will be able to
              view its history, but it will no longer post comments.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmComplete}
              className="bg-green-600 text-white hover:bg-green-700"
            >
              Complete Schedule
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CommentScheduler;
