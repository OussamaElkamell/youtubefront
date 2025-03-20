import { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { Calendar as CalendarIcon, Clock, Trash2, Edit, PlayCircle, PauseCircle, Plus, AlertTriangle } from "lucide-react";
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

// Form schema
const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  commentTemplates: z.array(z.string()).min(1, "At least one comment template is required"),
  targetVideos: z.array(z.object({
    videoId: z.string().min(1, "Video ID is required"),
    title: z.string().optional(),
    channelId: z.string().optional(),
    thumbnailUrl: z.string().optional(),
  })).min(1, "At least one video ID is required"),
  accountSelection: z.enum(["specific", "random", "round-robin"]),
  selectedAccounts: z.array(z.string()).min(1, "Select at least one account"),
  scheduleType: z.enum(["immediate", "once", "recurring", "interval"]),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  cronExpression: z.string().optional(),
  intervalValue: z.number().min(1).optional(),
  intervalUnit: z.enum(["minutes", "hours", "days"]).optional(),
  minDelay: z.number().min(0),
  maxDelay: z.number().min(0),
  betweenAccounts: z.number().min(0),
});

const CommentScheduler = () => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);
  const [selectedSchedule, setSelectedSchedule] = useState<any>(null);
  const [videoInput, setVideoInput] = useState("");
  const [commentInput, setCommentInput] = useState("");
  
  const { 
    schedules, 
    isLoading, 
    error, 
    createSchedule, 
    updateSchedule, 
    deleteSchedule, 
    pauseSchedule, 
    resumeSchedule 
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
      scheduleType: "immediate",
      startDate: new Date(),
      endDate: undefined,
      cronExpression: "",
      intervalValue: 1,
      intervalUnit: "days",
      minDelay: 30,
      maxDelay: 180,
      betweenAccounts: 300,
    },
  });

  const openCreateDialog = () => {
    form.reset({
      name: "",
      commentTemplates: [],
      targetVideos: [],
      accountSelection: "specific",
      selectedAccounts: [],
      scheduleType: "immediate",
      startDate: new Date(),
      endDate: undefined,
      cronExpression: "",
      intervalValue: 1,
      intervalUnit: "days",
      minDelay: 30,
      maxDelay: 180,
      betweenAccounts: 300,
    });
    setVideoInput("");
    setCommentInput("");
    setIsCreateDialogOpen(true);
  };

  const openEditDialog = (id: string) => {
    const schedule = schedules.find((s) => s._id === id);
    if (!schedule) return;

    setSelectedScheduleId(id);
    setSelectedSchedule(schedule);
    
    // Transform the schedule data to match form structure
    form.reset({
      name: schedule.name,
      commentTemplates: schedule.commentTemplates,
      targetVideos: schedule.targetVideos,
      accountSelection: schedule.accountSelection,
      selectedAccounts: schedule.selectedAccounts.map(acc => acc._id),
      scheduleType: schedule.schedule.type,
      startDate: schedule.schedule.startDate ? new Date(schedule.schedule.startDate) : undefined,
      endDate: schedule.schedule.endDate ? new Date(schedule.schedule.endDate) : undefined,
      cronExpression: schedule.schedule.cronExpression,
      intervalValue: schedule.schedule.interval?.value,
      intervalUnit: schedule.schedule.interval?.unit,
      minDelay: schedule.delays.minDelay,
      maxDelay: schedule.delays.maxDelay,
      betweenAccounts: schedule.delays.betweenAccounts,
    });
    
    setIsEditDialogOpen(true);
  };

  const addVideo = () => {
    if (!videoInput.trim()) return;
    
    // Process video IDs
    const videoIds = videoInput
      .split(/[\s,]+/)
      .map((id) => id.trim())
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
    
    const currentComments = form.getValues('commentTemplates') || [];
    
    if (!currentComments.includes(commentInput.trim())) {
      form.setValue('commentTemplates', [...currentComments, commentInput.trim()]);
      setCommentInput("");
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
    // Transform form data to API format
    const scheduleData: ScheduleFormData = {
      name: data.name,
      commentTemplates: data.commentTemplates,
      targetVideos: data.targetVideos,
      accountSelection: data.accountSelection,
      selectedAccounts: data.selectedAccounts,
      schedule: {
        type: data.scheduleType,
        startDate: data.startDate,
        endDate: data.endDate,
        cronExpression: data.cronExpression,
        interval: data.scheduleType === 'interval' ? {
          value: data.intervalValue || 1,
          unit: data.intervalUnit || 'days'
        } : undefined
      },
      delays: {
        minDelay: data.minDelay,
        maxDelay: data.maxDelay,
        betweenAccounts: data.betweenAccounts
      }
    };

    createSchedule(scheduleData);
    setIsCreateDialogOpen(false);
  };

  const handleEditSubmit = (data: z.infer<typeof formSchema>) => {
    if (!selectedScheduleId) return;

    // Transform form data to API format
    const scheduleData: Partial<ScheduleFormData> = {
      name: data.name,
      commentTemplates: data.commentTemplates,
      targetVideos: data.targetVideos,
      accountSelection: data.accountSelection,
      selectedAccounts: data.selectedAccounts,
      schedule: {
        type: data.scheduleType,
        startDate: data.startDate,
        endDate: data.endDate,
        cronExpression: data.cronExpression,
        interval: data.scheduleType === 'interval' ? {
          value: data.intervalValue || 1,
          unit: data.intervalUnit || 'days'
        } : undefined
      },
      delays: {
        minDelay: data.minDelay,
        maxDelay: data.maxDelay,
        betweenAccounts: data.betweenAccounts
      }
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
    deleteSchedule(id);
  };

  // Reset schedule type fields when schedule type changes
  useEffect(() => {
    const scheduleType = form.watch('scheduleType');
    
    if (scheduleType === 'immediate') {
      form.setValue('startDate', undefined);
      form.setValue('endDate', undefined);
      form.setValue('cronExpression', undefined);
      form.setValue('intervalValue', undefined);
      form.setValue('intervalUnit', undefined);
    } else if (scheduleType === 'once') {
      form.setValue('cronExpression', undefined);
      form.setValue('intervalValue', undefined);
      form.setValue('intervalUnit', undefined);
    } else if (scheduleType === 'recurring') {
      form.setValue('intervalValue', undefined);
      form.setValue('intervalUnit', undefined);
    } else if (scheduleType === 'interval') {
      form.setValue('cronExpression', undefined);
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
            <Card key={schedule._id} className={cn(schedule.status !== "active" && "opacity-70")}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl">{schedule.name}</CardTitle>
                    <CardDescription>
                      {schedule.schedule.startDate ? 
                        `Starting ${format(new Date(schedule.schedule.startDate), "PPP 'at' h:mm a")}` : 
                        schedule.schedule.type === 'immediate' ? 
                          'Runs immediately' : 
                          schedule.schedule.type === 'recurring' ? 
                            `Runs on schedule: ${schedule.schedule.cronExpression}` : 
                            schedule.schedule.type === 'interval' && schedule.schedule.interval ? 
                              `Runs every ${schedule.schedule.interval.value} ${schedule.schedule.interval.unit}` : 
                              'Schedule configuration'}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {schedule.status === "active" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-orange-500 border-orange-200 bg-orange-50"
                        onClick={() => toggleScheduleStatus(schedule._id, schedule.status)}
                      >
                        <PauseCircle className="mr-2 h-4 w-4" /> Pause
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-500 border-green-200 bg-green-50"
                        onClick={() => toggleScheduleStatus(schedule._id, schedule.status)}
                        disabled={schedule.status === 'completed' || schedule.status === 'error'}
                      >
                        <PlayCircle className="mr-2 h-4 w-4" /> Resume
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openEditDialog(schedule._id)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteSchedule(schedule._id)}
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
                            <div className="space-y-2">
                              {schedule.commentTemplates.map((comment, idx) => (
                                <div key={idx} className="bg-slate-50 rounded-md p-3 text-sm">
                                  {comment}
                                </div>
                              ))}
                            </div>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium mb-2">Schedule Configuration</h4>
                            <ul className="space-y-2 text-sm">
                              <li className="flex items-center gap-2">
                                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                                <span>
                                  Type: {schedule.schedule.type}
                                  {schedule.schedule.interval && 
                                    ` (Every ${schedule.schedule.interval.value || 1} ${schedule.schedule.interval.unit || 'minutes'})`}
                                  {schedule.schedule.cronExpression && 
                                    ` (${schedule.schedule.cronExpression})`}
                                </span>
                              </li>
                              <li className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <span>
                                  Delay: {schedule.delays.minDelay}-{schedule.delays.maxDelay} seconds, 
                                  {schedule.delays.betweenAccounts} seconds between accounts
                                </span>
                              </li>
                            </ul>
                            
                            <h4 className="text-sm font-medium mt-4 mb-2">Progress</h4>
                            <ul className="space-y-2 text-sm">
                              <li>
                                Total Comments: {schedule.progress.totalComments}
                              </li>
                              <li>
                                Posted: {schedule.progress.postedComments}
                              </li>
                              <li>
                                Failed: {schedule.progress.failedComments}
                              </li>
                            </ul>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium">Target Videos ({schedule.targetVideos.length})</h4>
                          <div className="flex flex-wrap gap-2">
                            {schedule.targetVideos.map((video) => (
                              <a
                                key={video.videoId}
                                href={`https://youtube.com/watch?v=${video.videoId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs bg-secondary px-2 py-1 rounded hover:bg-secondary/80"
                              >
                                {video.title || video.videoId}
                              </a>
                            ))}
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium">YouTube Accounts ({schedule.selectedAccounts.length})</h4>
                          <div className="flex flex-wrap gap-2">
                            {schedule.selectedAccounts.map((account) => (
                              <div key={account._id} className="text-xs bg-secondary px-2 py-1 rounded">
                                {account.channelTitle || account.email}
                                {account.status !== 'active' && (
                                  <span className="ml-1 text-amber-500">({account.status})</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

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
                  <FormLabel>Comment Templates</FormLabel>
                  <FormDescription>
                    Add different comment texts. One will be randomly selected for each post.
                  </FormDescription>
                  
                  <div className="flex gap-2">
                    <Input 
                      placeholder="Enter a comment template..." 
                      value={commentInput}
                      onChange={(e) => setCommentInput(e.target.value)}
                    />
                    <Button type="button" onClick={addComment} variant="secondary" className="shrink-0">Add</Button>
                  </div>
                  
                  {form.getValues('commentTemplates')?.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {form.getValues('commentTemplates').map((comment, index) => (
                        <div key={index} className="flex items-center justify-between bg-slate-50 rounded-md p-3 text-sm">
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
                  
                  {form.formState.errors.commentTemplates && (
                    <p className="text-sm font-medium text-destructive">
                      {form.formState.errors.commentTemplates.message}
                    </p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <FormLabel>Target YouTube Videos</FormLabel>
                  <FormDescription>
                    Add video IDs to comment on.
                  </FormDescription>
                  
                  <div className="flex gap-2">
                    <Input 
                      placeholder="Enter video IDs separated by commas" 
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
                              key={account._id}
                              control={form.control}
                              name="selectedAccounts"
                              render={({ field }) => {
                                return (
                                  <FormItem
                                    key={account._id}
                                    className="flex flex-row items-start space-x-3 space-y-0 py-1"
                                  >
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(account._id)}
                                        onCheckedChange={(checked) => {
                                          return checked
                                            ? field.onChange([...field.value, account._id])
                                            : field.onChange(
                                                field.value?.filter(
                                                  (value) => value !== account._id
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
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="intervalValue"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Interval Value</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min={1} 
                              {...field} 
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 1)} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="intervalUnit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Interval Unit</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select unit" />
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
                )}
                
                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Delay Settings</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="minDelay"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Min Delay (seconds)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min={0} 
                              {...field} 
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                            />
                          </FormControl>
                          <FormDescription>
                            Minimum wait before posting
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="maxDelay"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Max Delay (seconds)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min={0} 
                              {...field} 
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                            />
                          </FormControl>
                          <FormDescription>
                            Maximum wait before posting
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
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
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                            />
                          </FormControl>
                          <FormDescription>
                            Delay between each account
                          </FormDescription>
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
                  <FormLabel>Comment Templates</FormLabel>
                  <FormDescription>
                    Add different comment texts. One will be randomly selected for each post.
                  </FormDescription>
                  
                  <div className="flex gap-2">
                    <Input 
                      placeholder="Enter a comment template..." 
                      value={commentInput}
                      onChange={(e) => setCommentInput(e.target.value)}
                    />
                    <Button type="button" onClick={addComment} variant="secondary" className="shrink-0">Add</Button>
                  </div>
                  
                  {form.getValues('commentTemplates')?.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {form.getValues('commentTemplates').map((comment, index) => (
                        <div key={index} className="flex items-center justify-between bg-slate-50 rounded-md p-3 text-sm">
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
                  
                  {form.formState.errors.commentTemplates && (
                    <p className="text-sm font-medium text-destructive">
                      {form.formState.errors.commentTemplates.message}
                    </p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <FormLabel>Target YouTube Videos</FormLabel>
                  <FormDescription>
                    Add video IDs to comment on.
                  </FormDescription>
                  
                  <div className="flex gap-2">
                    <Input 
                      placeholder="Enter video IDs separated by commas" 
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
                              key={account._id}
                              control={form.control}
                              name="selectedAccounts"
                              render={({ field }) => {
                                return (
                                  <FormItem
                                    key={account._id}
                                    className="flex flex-row items-start space-x-3 space-y-0 py-1"
                                  >
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(account._id)}
                                        onCheckedChange={(checked) => {
                                          return checked
                                            ? field.onChange([...field.value, account._id])
                                            : field.onChange(
                                                field.value?.filter(
                                                  (value) => value !== account._id
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
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="intervalValue"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Interval Value</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min={1} 
                              {...field} 
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="intervalUnit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Interval Unit</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value || "minutes"}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select unit" />
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
                )}
                
                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Delay Settings</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="minDelay"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Min Delay (seconds)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min={0} 
                              {...field} 
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                            />
                          </FormControl>
                          <FormDescription>
                            Minimum wait before posting
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="maxDelay"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Max Delay (seconds)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min={0} 
                              {...field} 
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                            />
                          </FormControl>
                          <FormDescription>
                            Maximum wait before posting
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
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
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                            />
                          </FormControl>
                          <FormDescription>
                            Delay between each account
                          </FormDescription>
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
    </div>
  );
};

export default CommentScheduler;