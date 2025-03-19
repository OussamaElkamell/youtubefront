import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Trash2 } from "lucide-react";
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { ScheduleFormData, ScheduleType } from "@/hooks/use-schedules";
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

interface ScheduleFormProps {
  onSubmit: (data: ScheduleFormData) => void;
  initialValues?: ScheduleType;
  submitLabel?: string;
}

const ScheduleForm = ({ onSubmit, initialValues, submitLabel = "Create Schedule" }: ScheduleFormProps) => {
  const [videoInput, setVideoInput] = useState("");
  const [commentInput, setCommentInput] = useState("");
  const { accounts, isLoading: isLoadingAccounts } = useYouTubeAccountsSelect();
  
  const defaultValues = {
    name: "",
    commentTemplates: [],
    targetVideos: [],
    accountSelection: "specific" as const,
    selectedAccounts: [],
    scheduleType: "immediate" as const,
    startDate: new Date(),
    endDate: undefined,
    cronExpression: "",
    intervalValue: 1,
    intervalUnit: "days" as const,
    minDelay: 30,
    maxDelay: 180,
    betweenAccounts: 300,
  };

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: initialValues 
      ? {
          name: initialValues.name,
          commentTemplates: initialValues.commentTemplates,
          targetVideos: initialValues.targetVideos,
          accountSelection: initialValues.accountSelection,
          selectedAccounts: initialValues.selectedAccounts.map(acc => acc._id),
          scheduleType: initialValues.schedule.type,
          startDate: initialValues.schedule.startDate ? new Date(initialValues.schedule.startDate) : undefined,
          endDate: initialValues.schedule.endDate ? new Date(initialValues.schedule.endDate) : undefined,
          cronExpression: initialValues.schedule.cronExpression,
          intervalValue: initialValues.schedule.interval?.value,
          intervalUnit: initialValues.schedule.interval?.unit,
          minDelay: initialValues.delays.minDelay,
          maxDelay: initialValues.delays.maxDelay,
          betweenAccounts: initialValues.delays.betweenAccounts,
        }
      : defaultValues
  });

  const addVideo = () => {
    if (!videoInput.trim()) return;
    
    // Process video IDs
    const videoIds = videoInput
      .split(/[\s,]+/)
      .map((id) => id.trim())
      .filter(Boolean);
    
    const currentVideos = form.getValues('targetVideos') || [];
    
    // Add new videos that don't already exist - ensure videoId is required
    const newVideos = videoIds
      .filter(id => !currentVideos.some(v => v.videoId === id))
      .map(id => ({ videoId: id }));
    
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

    onSubmit(scheduleData);
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

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
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
                      onChange={e => field.onChange(Number(e.target.value))}
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
                    Wait time between account posts
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
        
        <div className="pt-4">
          <Button type="submit">{submitLabel}</Button>
        </div>
      </form>
    </Form>
  );
};

export default ScheduleForm;