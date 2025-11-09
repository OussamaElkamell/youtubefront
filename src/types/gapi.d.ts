
// Type definitions for Google APIs
declare global {
  interface Window {
    gapi: typeof gapi;
    google: any;
  }
}

interface GapiAuth2 {
  init(params: any): Promise<any>;
  getAuthInstance(): any;
}

interface GapiClient {
  init(params: any): Promise<void>;
  youtube: {
    channels: {
      list(params: any): Promise<any>;
    };
    search: {
      list(params: any): Promise<any>;
    };
    commentThreads: {
      list(params: any): Promise<any>;
      insert(params: any): Promise<any>;
    };
    videos: {
      list(params: any): Promise<any>;
    };
  };
  setToken(token: { access_token: string }): void;
}

interface Gapi {
  load(api: string, callback: () => void): void;
  client: GapiClient;
  auth2: GapiAuth2;
}

declare const gapi: Gapi;

export {};
