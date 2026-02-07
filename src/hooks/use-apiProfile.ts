// hooks/use-api-profiles.ts
import { useState, useEffect } from 'react';


export interface ApiProfile {
  id: string;
  name: string;
  clientId: string;
  clientSecret: string;
  apiKey: string;
  redirectUri: string;
  limitQuota?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const useApiProfiles = () => {
  const [profiles, setProfiles] = useState<ApiProfile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isSettingActive, setIsSettingActive] = useState(false);
  const API_BASE_URL = import.meta.env.VITE_API_URL;
  const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  };

  const fetchProfiles = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/profiles`, {
        headers: {
          ...getAuthHeader(),
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch profiles');
      }

      const data = await response.json();
      setProfiles(data.profiles || data); // Extract profiles if nested, otherwise use raw data
    } catch (err) {
      setError(err instanceof Error ? err : new Error('An unknown error occurred'));
    } finally {
      setIsLoading(false);
    }
  };

  const createProfile = async (profileData: Omit<ApiProfile, 'id' | 'createdAt' | 'updatedAt'>) => {
    setIsCreating(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/profiles`, {
        method: 'POST',
        headers: {
          ...getAuthHeader(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(profileData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create profile');
      }

      const newProfile = await response.json();
      setProfiles(prev => [newProfile, ...prev]);
      return newProfile;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('An unknown error occurred'));
      throw err;
    } finally {
      setIsCreating(false);
    }
  };

  const updateProfile = async (id: string, profileData: Partial<ApiProfile>) => {
    try {
      const response = await fetch(`${API_BASE_URL}/profiles/${id}`, {
        method: 'PUT',
        headers: {
          ...getAuthHeader(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(profileData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update profile');
      }

      const updatedProfile = await response.json();
      setProfiles(prev => prev.map(p => p.id === id ? updatedProfile : p));
      return updatedProfile;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('An unknown error occurred'));
      throw err;
    }
  };

  const deleteProfile = async (id: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/profiles/${id}`, {
        method: 'DELETE',
        headers: getAuthHeader()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete profile');
      }

      setProfiles(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err : new Error('An unknown error occurred'));
      throw err;
    }
  };

  const setActiveProfile = async (id: string) => {
    setIsSettingActive(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/profiles/${id}/set-active`, {
        method: 'POST',
        headers: getAuthHeader()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to set active profile');
      }

      // Refresh profiles to get updated active status
      await fetchProfiles();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('An unknown error occurred'));
      throw err;
    } finally {
      setIsSettingActive(false);
    }
  };


  useEffect(() => {
    fetchProfiles();
  }, []);

  return {
    profiles,
    isLoading,
    error,
    isCreating,
    isSettingActive,
    createProfile,
    updateProfile,
    deleteProfile,
    setActiveProfile,
    refresh: fetchProfiles
  };
};