
import { toast } from "sonner";
import { api } from "./api-client";

// YouTube API credentials
const API_KEY = import.meta.env.VITE_API_KEY;
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

// Add or connect YouTube account through the server
export const connectYouTubeAccount = async (credential: string, proxy?: string): Promise<any> => {
  try {
    console.log("YouTube API initialized successfully");
    
    // Send credential to server for processing
    const response = await api.post("/accounts", {
      credential,
      proxy: proxy || undefined
    });
    
    toast.success("YouTube account connected", {
      description: "Your YouTube account has been successfully connected.",
    });
    
    return response;
  } catch (error) {
    console.error("Error connecting YouTube account:", error);
    toast.error("Failed to connect YouTube account", {
      description: (error as Error).message || "Please try again later.",
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
