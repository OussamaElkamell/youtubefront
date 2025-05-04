import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useApiProfiles } from '@/hooks/use-apiProfile';

interface ApiProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ApiProfileDialog = ({ open, onOpenChange }: ApiProfileDialogProps) => {
  const { createProfile, isCreating, error } = useApiProfiles();
  const [formData, setFormData] = useState({
    name: '',
    clientId: '',
    clientSecret: '',
    apiKey: '',
    redirectUri: 'http://localhost:4000/accounts',
    isActive: false,
    limitQuota: 10000,
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [id]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.name || !formData.clientId || !formData.clientSecret || !formData.apiKey) {
      toast.error('Validation Error', {
        description: 'Please fill all required fields',
      });
      return;
    }

    try {
      await createProfile(formData);
      toast.success('Profile Created', {
        description: 'API profile has been successfully created',
      });
      onOpenChange(false);
      setFormData({
        name: '',
        clientId: '',
        clientSecret: '',
        apiKey: '',
        redirectUri: 'http://localhost:4000/accounts',
        isActive: false,
        limitQuota:10000
      });
    } catch (err) {
      toast.error('Error Creating Profile', {
        description: error?.message || 'Failed to create API profile',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create API Profile</DialogTitle>
          <DialogDescription>
            Add a new set of API credentials for YouTube integration
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div>
            <Label htmlFor="name">Profile Name *</Label>
            <Input
              id="name"
              placeholder="My Production API"
              value={formData.name}
              onChange={handleInputChange}
              className="mt-2"
              required
            />
          </div>
          
          <div>
            <Label htmlFor="clientId">Client ID *</Label>
            <Input
              id="clientId"
              placeholder="Enter Client ID"
              value={formData.clientId}
              onChange={handleInputChange}
              className="mt-2"
              required
            />
          </div>
          
          <div>
            <Label htmlFor="clientSecret">Client Secret *</Label>
            <Input
              id="clientSecret"
              type="password"
              placeholder="Enter Client Secret"
              value={formData.clientSecret}
              onChange={handleInputChange}
              className="mt-2"
              required
            />
          </div>
          
          <div>
            <Label htmlFor="apiKey">YouTube API Key *</Label>
            <Input
              id="apiKey"
              placeholder="Enter YouTube API Key"
              value={formData.apiKey}
              onChange={handleInputChange}
              className="mt-2"
              required
            />
          </div>
          
          <div>
            <Label htmlFor="redirectUri">Redirect URI</Label>
            <Input
              id="redirectUri"
              placeholder="Enter Redirect URI"
              value={formData.redirectUri}
              onChange={handleInputChange}
              className="mt-2"
            />
          </div>
          <div>
  <Label htmlFor="limitQuota">Quota Limit</Label>
  <Input
    id="limitQuota"
    type="number"
    placeholder="e.g. 10000"
    value={formData.limitQuota}
    onChange={handleInputChange}
    className="mt-2"
  />
</div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                isActive: e.target.checked
              }))}
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <Label htmlFor="isActive">Set as active profile</Label>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              disabled={isCreating}
            >
              {isCreating ? 'Creating...' : 'Create Profile'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};