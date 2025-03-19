
import { 
    Dialog, 
    DialogContent, 
    DialogDescription, 
    DialogHeader, 
    DialogTitle 
  } from "@/components/ui/dialog";
  import { ScrollArea } from "@/components/ui/scroll-area";
  import { ScheduleFormData, ScheduleType } from "@/hooks/use-schedules";
  import ScheduleForm from "./ScheduleForm";
  
  interface EditScheduleDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (data: ScheduleFormData) => void;
    schedule: ScheduleType;
  }
  
  const EditScheduleDialog = ({ isOpen, onOpenChange, onSubmit, schedule }: EditScheduleDialogProps) => {
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Edit Comment Schedule</DialogTitle>
            <DialogDescription>
              Update settings for this automated comment schedule.
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="max-h-[70vh] pr-4">
            <ScheduleForm 
              onSubmit={onSubmit} 
              initialValues={schedule} 
              submitLabel="Update Schedule" 
            />
          </ScrollArea>
        </DialogContent>
      </Dialog>
    );
  };
  
  export default EditScheduleDialog;