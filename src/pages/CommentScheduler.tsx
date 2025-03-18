
import { useState } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Clock, Trash2, Edit, PlayCircle, PauseCircle, Plus, ChevronDown } from "lucide-react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

// Mock data
const youtubeAccounts = [
  { id: 1, email: "channel1@gmail.com", status: "active" },
  { id: 2, email: "youtube-creator@gmail.com", status: "active" },
  { id: 3, email: "disconnected@gmail.com", status: "inactive" },
];

const initialPlanners = [
  {
    id: 1,
    name: "New Video Promotion",
    comment: "Great video! I love the insights you shared about content creation. Keep up the good work!",
    videos: ["dQw4w9WgXcQ", "9bZkp7q19f0"],
    accounts: [1, 2],
    startDate: new Date(2023, 9, 15, 8, 30),
    repeatEvery: { value: 1, unit: "days" },
    delay: { value: 30, unit: "seconds" },
    status: "active",
  },
  {
    id: 2,
    name: "Channel Promotion",
    comment: "Just found your channel and it's amazing! I'd appreciate if you could check out my content as well.",
    videos: ["xvFZjo5PgG0"],
    accounts: [1],
    startDate: new Date(2023, 9, 18, 14, 0),
    repeatEvery: { value: 2, unit: "hours" },
    delay: { value: 15, unit: "seconds" },
    status: "paused",
  },
];

// Form schema
const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  comment: z.string().min(1, "Comment text is required"),
  videoIds: z.string().min(1, "At least one video ID is required"),
  accounts: z.array(z.number()).min(1, "Select at least one account"),
  startDate: z.date(),
  startTime: z.string(),
  repeatValue: z.coerce.number().min(1),
  repeatUnit: z.enum(["minutes", "hours", "days"]),
  delayValue: z.coerce.number().min(0),
  delayUnit: z.enum(["seconds", "minutes"]),
});

const CommentScheduler = () => {
  const [planners, setPlanners] = useState(initialPlanners);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedPlannerId, setSelectedPlannerId] = useState<number | null>(null);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      comment: "",
      videoIds: "",
      accounts: [],
      startDate: new Date(),
      startTime: "12:00",
      repeatValue: 1,
      repeatUnit: "days",
      delayValue: 30,
      delayUnit: "seconds",
    },
  });

  const openCreateDialog = () => {
    form.reset();
    setIsCreateDialogOpen(true);
  };

  const openEditDialog = (id: number) => {
    const planner = planners.find((p) => p.id === id);
    if (!planner) return;

    form.reset({
      name: planner.name,
      comment: planner.comment,
      videoIds: planner.videos.join(", "),
      accounts: planner.accounts,
      startDate: planner.startDate,
      startTime: format(planner.startDate, "HH:mm"),
      repeatValue: planner.repeatEvery.value,
      repeatUnit: planner.repeatEvery.unit as any,
      delayValue: planner.delay.value,
      delayUnit: planner.delay.unit as any,
    });

    setSelectedPlannerId(id);
    setIsEditDialogOpen(true);
  };

  const handleSubmit = (data: z.infer<typeof formSchema>) => {
    // Combine date and time
    const [hours, minutes] = data.startTime.split(":").map(Number);
    const startDate = new Date(data.startDate);
    startDate.setHours(hours, minutes);

    // Process video IDs
    const videos = data.videoIds
      .split(/[\s,]+/)
      .map((id) => id.trim())
      .filter(Boolean);

    const newPlanner = {
      id: planners.length + 1,
      name: data.name,
      comment: data.comment,
      videos,
      accounts: data.accounts,
      startDate,
      repeatEvery: { value: data.repeatValue, unit: data.repeatUnit },
      delay: { value: data.delayValue, unit: data.delayUnit },
      status: "active",
    };

    setPlanners([...planners, newPlanner]);
    setIsCreateDialogOpen(false);
    toast.success("Planner created", {
      description: `Comment scheduler "${data.name}" has been created.`,
    });
  };

  const handleEditSubmit = (data: z.infer<typeof formSchema>) => {
    if (!selectedPlannerId) return;

    // Combine date and time
    const [hours, minutes] = data.startTime.split(":").map(Number);
    const startDate = new Date(data.startDate);
    startDate.setHours(hours, minutes);

    // Process video IDs
    const videos = data.videoIds
      .split(/[\s,]+/)
      .map((id) => id.trim())
      .filter(Boolean);

    setPlanners(
      planners.map((planner) =>
        planner.id === selectedPlannerId
          ? {
              ...planner,
              name: data.name,
              comment: data.comment,
              videos,
              accounts: data.accounts,
              startDate,
              repeatEvery: { value: data.repeatValue, unit: data.repeatUnit },
              delay: { value: data.delayValue, unit: data.delayUnit },
            }
          : planner
      )
    );

    setIsEditDialogOpen(false);
    setSelectedPlannerId(null);
    toast.success("Planner updated", {
      description: `Comment scheduler "${data.name}" has been updated.`,
    });
  };

  const togglePlannerStatus = (id: number) => {
    setPlanners(
      planners.map((planner) =>
        planner.id === id
          ? {
              ...planner,
              status: planner.status === "active" ? "paused" : "active",
            }
          : planner
      )
    );

    const planner = planners.find((p) => p.id === id);
    const newStatus = planner?.status === "active" ? "paused" : "active";
    
    toast.success(`Planner ${newStatus}`, {
      description: `Comment scheduler "${planner?.name}" is now ${newStatus}.`,
    });
  };

  const deletePlanner = (id: number) => {
    const plannerToDelete = planners.find((p) => p.id === id);
    setPlanners(planners.filter((planner) => planner.id !== id));
    
    toast.success("Planner deleted", {
      description: `Comment scheduler "${plannerToDelete?.name}" has been deleted.`,
    });
  };

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

      {planners.length === 0 ? (
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
          {planners.map((planner) => (
            <Card key={planner.id} className={cn(planner.status === "paused" && "opacity-70")}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl">{planner.name}</CardTitle>
                    <CardDescription>
                      Starting {format(planner.startDate, "PPP 'at' h:mm a")}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {planner.status === "active" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-orange-500 border-orange-200 bg-orange-50"
                        onClick={() => togglePlannerStatus(planner.id)}
                      >
                        <PauseCircle className="mr-2 h-4 w-4" /> Pause
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-500 border-green-200 bg-green-50"
                        onClick={() => togglePlannerStatus(planner.id)}
                      >
                        <PlayCircle className="mr-2 h-4 w-4" /> Resume
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openEditDialog(planner.id)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deletePlanner(planner.id)}
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
                            <h4 className="text-sm font-medium mb-2">Comment Text</h4>
                            <div className="bg-slate-50 rounded-md p-3 text-sm">
                              {planner.comment}
                            </div>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium mb-2">Schedule Configuration</h4>
                            <ul className="space-y-2 text-sm">
                              <li className="flex items-center gap-2">
                                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                                <span>
                                  Repeats every {planner.repeatEvery.value}{" "}
                                  {planner.repeatEvery.unit}
                                </span>
                              </li>
                              <li className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <span>
                                  {planner.delay.value} {planner.delay.unit} delay between accounts
                                </span>
                              </li>
                            </ul>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium">Target Videos ({planner.videos.length})</h4>
                          <div className="flex flex-wrap gap-2">
                            {planner.videos.map((videoId) => (
                              <a
                                key={videoId}
                                href={`https://youtube.com/watch?v=${videoId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs bg-secondary px-2 py-1 rounded hover:bg-secondary/80"
                              >
                                {videoId}
                              </a>
                            ))}
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium">YouTube Accounts ({planner.accounts.length})</h4>
                          <div className="flex flex-wrap gap-2">
                            {planner.accounts.map((accountId) => {
                              const account = youtubeAccounts.find((a) => a.id === accountId);
                              return account ? (
                                <div key={accountId} className="text-xs bg-secondary px-2 py-1 rounded">
                                  {account.email}
                                </div>
                              ) : null;
                            })}
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

      {/* Create Planner Dialog */}
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
                
                <FormField
                  control={form.control}
                  name="comment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Comment Text</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter your comment here..."
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="videoIds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>YouTube Video IDs</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter video IDs, separated by commas or new lines"
                          className="min-h-[80px]"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        E.g., dQw4w9WgXcQ, 9bZkp7q19f0
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="accounts"
                  render={() => (
                    <FormItem>
                      <div className="mb-4">
                        <FormLabel>YouTube Accounts</FormLabel>
                        <FormDescription>
                          Select the accounts to post comments from.
                        </FormDescription>
                      </div>
                      <div className="space-y-2">
                        {youtubeAccounts.map((account) => (
                          <FormField
                            key={account.id}
                            control={form.control}
                            name="accounts"
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
                                      disabled={account.status === "inactive"}
                                    />
                                  </FormControl>
                                  <FormLabel className="font-normal">
                                    {account.email}{" "}
                                    {account.status === "inactive" && (
                                      <span className="text-muted-foreground ml-2">(inactive)</span>
                                    )}
                                  </FormLabel>
                                </FormItem>
                              );
                            }}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  
                  <FormField
                    control={form.control}
                    name="startTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Time</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <Label>Repeat Frequency</Label>
                    <div className="flex gap-2">
                      <FormField
                        control={form.control}
                        name="repeatValue"
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormControl>
                              <Input type="number" min={1} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="repeatUnit"
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
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
                  </div>
                  
                  <div className="space-y-4">
                    <Label>Delay Between Accounts</Label>
                    <div className="flex gap-2">
                      <FormField
                        control={form.control}
                        name="delayValue"
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormControl>
                              <Input type="number" min={0} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="delayUnit"
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select unit" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="seconds">Seconds</SelectItem>
                                <SelectItem value="minutes">Minutes</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>
                
                <DialogFooter>
                  <Button type="submit">Create Schedule</Button>
                </DialogFooter>
              </form>
            </Form>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Edit Planner Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Edit Comment Schedule</DialogTitle>
            <DialogDescription>
              Update your comment scheduler settings.
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="max-h-[70vh] pr-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleEditSubmit)} className="space-y-6 py-4">
                {/* Same form fields as create dialog */}
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
                
                <FormField
                  control={form.control}
                  name="comment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Comment Text</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter your comment here..."
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="videoIds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>YouTube Video IDs</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter video IDs, separated by commas or new lines"
                          className="min-h-[80px]"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        E.g., dQw4w9WgXcQ, 9bZkp7q19f0
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="accounts"
                  render={() => (
                    <FormItem>
                      <div className="mb-4">
                        <FormLabel>YouTube Accounts</FormLabel>
                        <FormDescription>
                          Select the accounts to post comments from.
                        </FormDescription>
                      </div>
                      <div className="space-y-2">
                        {youtubeAccounts.map((account) => (
                          <FormField
                            key={account.id}
                            control={form.control}
                            name="accounts"
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
                                      disabled={account.status === "inactive"}
                                    />
                                  </FormControl>
                                  <FormLabel className="font-normal">
                                    {account.email}{" "}
                                    {account.status === "inactive" && (
                                      <span className="text-muted-foreground ml-2">(inactive)</span>
                                    )}
                                  </FormLabel>
                                </FormItem>
                              );
                            }}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  
                  <FormField
                    control={form.control}
                    name="startTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Time</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <Label>Repeat Frequency</Label>
                    <div className="flex gap-2">
                      <FormField
                        control={form.control}
                        name="repeatValue"
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormControl>
                              <Input type="number" min={1} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="repeatUnit"
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
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
                  </div>
                  
                  <div className="space-y-4">
                    <Label>Delay Between Accounts</Label>
                    <div className="flex gap-2">
                      <FormField
                        control={form.control}
                        name="delayValue"
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormControl>
                              <Input type="number" min={0} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="delayUnit"
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select unit" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="seconds">Seconds</SelectItem>
                                <SelectItem value="minutes">Minutes</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>
                
                <DialogFooter>
                  <Button type="submit">Save Changes</Button>
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
