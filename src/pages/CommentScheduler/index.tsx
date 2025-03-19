import { useState } from "react";
import { AlertTriangle, Calendar, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useSchedules } from "@/hooks/use-schedules";
import ScheduleCard from "./components/ScheduleCard";
import CreateScheduleDialog from "./components/EditScheduleDialog";
import EditScheduleDialog from "./components/EditScheduleDialog";

const CommentScheduler = () => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);
  const [selectedSchedule, setSelectedSchedule] = useState<any>(null);
  
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

  const openCreateDialog = () => {
    setIsCreateDialogOpen(true);
  };

  const openEditDialog = (id: string) => {
    const schedule = schedules.find((s) => s._id === id);
    if (!schedule) return;

    setSelectedScheduleId(id);
    setSelectedSchedule(schedule);
    setIsEditDialogOpen(true);
  };

  const handleToggleScheduleStatus = (id: string, status: string) => {
    if (status === 'active') {
      pauseSchedule(id);
    } else if (status === 'paused') {
      resumeSchedule(id);
    }
  };

  const handleDeleteSchedule = (id: string) => {
    deleteSchedule(id);
  };

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
            <ScheduleCard
              key={schedule._id}
              schedule={schedule}
              onEdit={() => openEditDialog(schedule._id)}
              onDelete={() => handleDeleteSchedule(schedule._id)}
              onToggleStatus={() => handleToggleScheduleStatus(schedule._id, schedule.status)}
            />
          ))}
        </div>
      )}

      <CreateScheduleDialog 
              isOpen={isCreateDialogOpen}
              onOpenChange={setIsCreateDialogOpen}
              onSubmit={createSchedule} schedule={{
                  _id: "",
                  name: "",
                  status: "error",
                  commentTemplates: [],
                  targetVideos: [],
                  targetChannels: [],
                  accountSelection: "specific",
                  selectedAccounts: [],
                  schedule: {
                      type: "immediate",
                      startDate: undefined,
                      endDate: undefined,
                      cronExpression: "",
                      interval: {
                          value: 0,
                          unit: "minutes"
                      }
                  },
                  delays: {
                      minDelay: 0,
                      maxDelay: 0,
                      betweenAccounts: 0
                  },
                  progress: {
                      totalComments: 0,
                      postedComments: 0,
                      failedComments: 0
                  },
                  createdAt: undefined
              }}      />

      {selectedSchedule && (
        <EditScheduleDialog
          isOpen={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          onSubmit={(data) => {
            if (selectedScheduleId) {
              updateSchedule({ id: selectedScheduleId, data });
              setIsEditDialogOpen(false);
              setSelectedScheduleId(null);
            }
          }}
          schedule={selectedSchedule}
        />
      )}
    </div>
  );
};

export default CommentScheduler;