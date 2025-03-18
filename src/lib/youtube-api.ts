
import { toast } from "sonner";

// YouTube API credentials
const API_KEY = import.meta.env.VITE_API_KEY;
const OAUTH_CLIENT_ID = import.meta.env.VITE_OAUTH_CLIENT_ID;

const SCOPES = [
  "https://www.googleapis.com/auth/youtube.force-ssl",
  "https://www.googleapis.com/auth/youtube.readonly"
];
const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/youtube/v3/rest"];

// Type definitions
export interface YouTubeAccount {
  id: number;
  email: string;
  status: "active" | "inactive";
  proxy: string;
  connectedDate: string;
  channelId?: string;
  channelTitle?: string;
  thumbnailUrl?: string;
}

let gapiInitialized = false;
let gsiInitialized = false;

// Initialize the Google API client library
export const initializeGapiClient = (): Promise<void> => {
  if (gapiInitialized) return Promise.resolve();
  
  return new Promise<void>((resolve, reject) => {
    // Load the Google API Client Library
    const script = document.createElement("script");
    script.src = "https://apis.google.com/js/api.js";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      window.gapi.load("client", async () => {
        try {
          await window.gapi.client.init({
            apiKey: API_KEY,
            discoveryDocs: DISCOVERY_DOCS,
          });
          gapiInitialized = true;
          console.log("GAPI client initialized");
          resolve();
        } catch (error) {
          console.error("Error initializing GAPI client", error);
          reject(error);
        }
      });
    };
    script.onerror = (error) => {
      console.error("Error loading GAPI script", error);
      reject(error);
    };
    document.body.appendChild(script);
  });
};

// Initialize Google Sign-In
export const initializeGoogleSignIn = (): Promise<void> => {
  if (gsiInitialized) return Promise.resolve();
  
  return new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      gsiInitialized = true;
      console.log("GSI client initialized");
      resolve();
    };
    script.onerror = (error) => {
      console.error("Error loading GSI script", error);
      reject(error);
    };
    document.body.appendChild(script);
  });
};

// Initialize both APIs
export const initializeAPIs = async (): Promise<void> => {
  try {
    await Promise.all([initializeGapiClient(), initializeGoogleSignIn()]);
    console.log("All APIs initialized");
  } catch (error) {
    console.error("Failed to initialize APIs", error);
    toast.error("Failed to initialize YouTube API", {
      description: "Please check your internet connection and try again.",
    });
    throw error;
  }
};

// Get the signed-in user's channel info
export const getChannelInfo = async (): Promise<{
  channelId: string;
  title: string;
  thumbnailUrl: string;
  email: string;
}> => {
  try {
    // Get the user's channel
    const channelResponse = await window.gapi.client.youtube.channels.list({
      part: "snippet,contentDetails",
      mine: true,
    });
    
    const channel = channelResponse.result.items?.[0];
    if (!channel) {
      throw new Error("No channel found for this account");
    }
    
    // Get the user's email
    const authInstance = window.gapi.auth2.getAuthInstance();
    const user = authInstance.currentUser.get();
    const profile = user.getBasicProfile();
    const email = profile.getEmail();
    
    return {
      channelId: channel.id,
      title: channel.snippet.title,
      thumbnailUrl: channel.snippet.thumbnails?.default?.url || "",
      email,
    };
  } catch (error) {
    console.error("Error fetching channel info", error);
    throw error;
  }
};

// Sign in the user with Google
export const signInWithGoogle = async (): Promise<{
  email: string;
  accessToken: string;
  channelInfo: {
    channelId: string;
    title: string;
    thumbnailUrl: string;
  };
}> => {
  try {
    await initializeAPIs();
    
    // Load the auth2 library
    if (!window.gapi.auth2) {
      await new Promise<void>((resolve) => {
        window.gapi.load("auth2", async () => {
          await window.gapi.auth2.init({
            client_id: OAUTH_CLIENT_ID,
            scope: SCOPES.join(" "),
          });
          resolve();
        });
      });
    }
    
    // Sign in with Google
    const authInstance = window.gapi.auth2.getAuthInstance();
    const googleUser = await authInstance.signIn({
      scope: SCOPES.join(" "),
    });
    
    // Get auth response
    const authResponse = googleUser.getAuthResponse();
    const accessToken = authResponse.access_token;
    
    // Set the access token for API calls
    window.gapi.client.setToken({
      access_token: accessToken,
    });
    
    // Get user channel info
    const channelInfo = await getChannelInfo();
    
    return {
      email: channelInfo.email,
      accessToken,
      channelInfo: {
        channelId: channelInfo.channelId,
        title: channelInfo.title,
        thumbnailUrl: channelInfo.thumbnailUrl,
      },
    };
  } catch (error) {
    console.error("Error signing in with Google", error);
    if ((error as any).error === "popup_closed_by_user") {
      toast.error("Sign-in cancelled", {
        description: "You closed the Google sign-in popup.",
      });
    } else {
      toast.error("Failed to sign in with Google", {
        description: (error as Error).message || "Please try again later.",
      });
    }
    throw error;
  }
};

// Sign out the user
export const signOutFromGoogle = async (): Promise<void> => {
  try {
    if (!window.gapi.auth2) {
      await new Promise<void>((resolve) => {
        window.gapi.load("auth2", async () => {
          await window.gapi.auth2.init({
            client_id: OAUTH_CLIENT_ID,
          });
          resolve();
        });
      });
    }
    
    const authInstance = window.gapi.auth2.getAuthInstance();
    await authInstance.signOut();
    
    console.log("User signed out");
  } catch (error) {
    console.error("Error signing out", error);
    toast.error("Failed to sign out", {
      description: "Please try again later.",
    });
    throw error;
  }
};

// Get user's YouTube videos
export const getUserVideos = async (pageToken?: string): Promise<{
  items: any[];
  nextPageToken?: string;
}> => {
  try {
    const response = await window.gapi.client.youtube.search.list({
      part: "snippet",
      forMine: true,
      maxResults: 25,
      pageToken,
      type: "video",
    });
    
    return {
      items: response.result.items || [],
      nextPageToken: response.result.nextPageToken,
    };
  } catch (error) {
    console.error("Error fetching user videos", error);
    toast.error("Failed to fetch your videos", {
      description: "Please try again later.",
    });
    throw error;
  }
};

// Post a comment to a YouTube video
export const postComment = async (videoId: string, text: string): Promise<any> => {
  try {
    const response = await window.gapi.client.youtube.commentThreads.insert({
      part: "snippet",
      resource: {
        snippet: {
          videoId,
          topLevelComment: {
            snippet: {
              textOriginal: text,
            },
          },
        },
      },
    });
    
    return response.result;
  } catch (error) {
    console.error("Error posting comment", error);
    toast.error("Failed to post comment", {
      description: (error as any).result?.error?.message || "Please try again later.",
    });
    throw error;
  }
};

// Get YouTube API quota usage
export const getQuotaUsage = async (): Promise<number> => {
  // This is a placeholder. YouTube API doesn't directly expose quota usage.
  // In a real application, you would track this server-side.
  return 0;
};
