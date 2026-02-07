import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ApiProfile } from '@/hooks/use-apiProfile';
import { CheckCircle, Loader2, Trash2, Pencil } from 'lucide-react';
import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ProfileSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profiles: ApiProfile[];
  activeProfileId?: string;
  onSelectProfile: (id: string) => Promise<boolean | void>;
  onDeleteProfile: (id: string) => Promise<void>;
  onUpdateProfile: (id: string, profileData: Partial<ApiProfile>) => Promise<void>;
  isLoading: boolean;
  isDeleting?: boolean;
  isUpdating?: boolean;
}

export const ProfileSelectionDialog = ({
  open,
  onOpenChange,
  profiles,
  activeProfileId,
  onSelectProfile,
  onDeleteProfile,
  onUpdateProfile,
  isLoading,
  isDeleting,
  isUpdating,
}: ProfileSelectionDialogProps) => {
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [profileToDelete, setProfileToDelete] = useState<string | null>(null);
  const [editingProfile, setEditingProfile] = useState<ApiProfile | null>(null);

  const handleSelectProfile = async () => {
    if (!selectedProfileId) return;
    await onSelectProfile(selectedProfileId);
    onOpenChange(false);
  };

  const handleDeleteProfile = async () => {
    if (!profileToDelete) return;
    await onDeleteProfile(profileToDelete);
    setProfileToDelete(null);
    if (selectedProfileId === profileToDelete) {
      setSelectedProfileId(null);
    }
  };

  const handleUpdateProfile = async () => {
    if (!editingProfile) return;
    await onUpdateProfile(editingProfile.id, {
      name: editingProfile.name,
      clientId: editingProfile.clientId,
      clientSecret: editingProfile.clientSecret,
      apiKey: editingProfile.apiKey,
      redirectUri: editingProfile.redirectUri,
      limitQuota: editingProfile.limitQuota,
    });
    setEditingProfile(null);
  };

  const handleEditFieldChange = (field: keyof ApiProfile, value: string | number) => {
    if (!editingProfile) return;
    setEditingProfile({
      ...editingProfile,
      [field]: value,
    });
  };

  return (
    <>
      {/* Main Profile Selection Dialog */}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">API Profile Management</DialogTitle>
            <DialogDescription>
              Manage your API credential profiles
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="max-h-[400px] overflow-y-auto space-y-3">
              {profiles.map((profile) => (
                <div
                  key={profile.id}
                  className={`p-4 border rounded-lg transition-all ${selectedProfileId === profile.id
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'hover:bg-muted/30'
                    } ${profile.id === activeProfileId ? 'ring-1 ring-green-500/30' : ''
                    }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div
                      className="flex-1 cursor-pointer space-y-2"
                      onClick={() => setSelectedProfileId(profile.id)}
                    >
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-base">{profile.name}</h4>
                        {profile.id === activeProfileId && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Active
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="space-y-1">
                          <p className="text-muted-foreground">Client ID</p>
                          <p className="font-mono truncate">{profile.clientId}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-muted-foreground">API Key</p>
                          <p className="font-mono truncate">{profile.apiKey}</p>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground pt-1">
                        Quota: {profile.limitQuota ?? 'N/A'}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingProfile(profile);
                        }}
                        disabled={isLoading || isUpdating}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          setProfileToDelete(profile.id);
                        }}
                        disabled={isLoading || isDeleting}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSelectProfile}
              disabled={!selectedProfileId || isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Applying...
                </>
              ) : (
                'Set as Active'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!profileToDelete}
        onOpenChange={(open) => !open && setProfileToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Profile Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the API profile and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProfile}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Profile'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Profile Dialog */}
      <Dialog
        open={!!editingProfile}
        onOpenChange={(open) => !open && setEditingProfile(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit API Profile</DialogTitle>
            <DialogDescription>
              Update the profile credentials and settings
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Profile Name</Label>
              <Input
                id="name"
                value={editingProfile?.name || ''}
                onChange={(e) => handleEditFieldChange('name', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clientId">Client ID</Label>
              <Input
                id="clientId"
                value={editingProfile?.clientId || ''}
                onChange={(e) => handleEditFieldChange('clientId', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clientSecret">Client Secret</Label>
              <Input
                id="clientSecret"
                value={editingProfile?.clientSecret || ''}
                onChange={(e) => handleEditFieldChange('clientSecret', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key</Label>
              <Input
                id="apiKey"
                value={editingProfile?.apiKey || ''}
                onChange={(e) => handleEditFieldChange('apiKey', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="redirectUri">Redirect URI</Label>
              <Input
                id="redirectUri"
                value={editingProfile?.redirectUri || ''}
                onChange={(e) => handleEditFieldChange('redirectUri', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quota">Quota</Label>
              <Input
                id="quota"
                type="number"
                value={editingProfile?.limitQuota ?? ''}
                onChange={(e) =>
                  handleEditFieldChange('limitQuota', parseInt(e.target.value || '0', 10))
                }
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setEditingProfile(null)}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdateProfile} disabled={isUpdating}>
              {isUpdating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
