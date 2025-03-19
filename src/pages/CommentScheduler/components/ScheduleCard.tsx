import { format } from "date-fns";
import { Edit, PauseCircle, PlayCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { ScheduleType } from "@/hooks/use-schedules";
import { CalendarIcon, Clock } from "lucide-react";

interface ScheduleCardProps {
  schedule: ScheduleType;
  onEdit: () => void;
  onDelete: () => void;
  onToggleStatus: () => void;
}

const ScheduleCard = ({ schedule, onEdit, onDelete, onToggleStatus }: ScheduleCardProps) => {
  return (
    <Card className={cn(schedule.status !== "active" && "opacity-70")}>
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
                onClick={onToggleStatus}
              >
                <PauseCircle className="mr-2 h-4 w-4" /> Pause
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="text-green-500 border-green-200 bg-green-50"
                onClick={onToggleStatus}
                disabled={schedule.status === 'completed' || schedule.status === 'error'}
              >
                <PlayCircle className="mr-2 h-4 w-4" /> Resume
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={onEdit}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={onDelete}
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
                            ` (Every ${schedule.schedule.interval.value} ${schedule.schedule.interval.unit})`}
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
  );
};

export default ScheduleCard;