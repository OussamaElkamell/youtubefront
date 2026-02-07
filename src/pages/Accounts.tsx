

import { useEffect, useState, useRef } from "react";
import { CheckCircle, XCircle, RefreshCw, Link, Trash2, Plus, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useYouTubeAccounts } from "@/hooks/use-youtube-accounts";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";
import { initializeAPIs, connectYouTubeAccount, exchangeAuthCodeForToken } from "@/lib/youtube-api";
import { useSearchParams } from "react-router-dom";
import { ApiProfile, useApiProfiles } from "@/hooks/use-apiProfile";
import { ApiProfileDialog } from "@/components/dialogs/AddProfileDialog";
import { ProfileSelectionDialog } from "@/components/dialogs/ProfileSelectionDialog";
import { api } from "@/lib/api-client";
import { useQueryClient } from "@tanstack/react-query";


const Accounts = () => {
  const {
    accounts,
    isLoading,
    error,
    addAccount,
    removeAccount,
    toggleAccountStatus,
    updateAccountProxy,
    verifyAccount,
    refreshToken
  } = useYouTubeAccounts();

  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [isProxyDialogOpen, setIsProxyDialogOpen] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [proxyValue, setProxyValue] = useState("");
  const isMobile = useIsMobile();
  const ITEMS_PER_PAGE = 4;


  const [currentPage, setCurrentPage] = useState(1);
  const {
    profiles,


    setActiveProfile,
    isSettingActive,
    deleteProfile,
    updateProfile,
    refresh: refreshProfiles,
  } = useApiProfiles();
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const [isProfileActiveDialogOpen, setIsProfileActiveDialogOpen] = useState(false);
  const activeProfile = profiles.find((p) => p.isActive);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  useState(() => {
    initializeAPIs().catch(console.error);
  });



  let AUTH_URL = '';

  if (activeProfile) {
    AUTH_URL = `https://accounts.google.com/o/oauth2/auth?client_id=${activeProfile.clientId}&redirect_uri=${activeProfile.redirectUri}&response_type=code&scope=openid email profile https://www.googleapis.com/auth/youtube.force-ssl&access_type=offline&&prompt=consent`;
  } else {
    console.error("No active profile found. Cannot generate AUTH_URL.");
  }

  const [selectedProfile, setSelectedProfile] = useState(null);

  const handleChange = (e: { target: { value: string; }; }) => {
    const profile = profiles.find(p => p.id === e.target.value);
    setSelectedProfile(profile);
  };

  const filteredAccounts = selectedProfile
    ? accounts.filter(account => account.google?.clientId === selectedProfile.clientId)
    : accounts;

  const [authCode, setAuthCode] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const processedCodeRef = useRef<string | null>(null);

  useEffect(() => {
    if (!activeProfile) return;

    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");

    if (code && code !== processedCodeRef.current) {
      console.log("Authorization code received:", code);
      processedCodeRef.current = code;
      setAuthCode(code);

      exchangeAuthCodeForToken(code, activeProfile).then((idToken) => {
        console.log("idToken", idToken);
        if (idToken) {
          connectYouTubeAccount(queryClient, idToken, proxyValue);

          // Remove code from URL to prevent reuse on refresh
          const newUrl = window.location.pathname;
          window.history.replaceState({}, document.title, newUrl);
        }
      }).catch(err => {
        console.error("OAuth error:", err);
        toast.error("Failed to connect account", { description: err.message });
      });
    }
  }, [activeProfile]); // Runs when activeProfile changes



  const handleDeleteProfile = async (id: string) => {
    setIsDeleting(true);
    try {
      await deleteProfile(id);
      // Optional: Show success message
    } catch (error) {
      console.error('Error deleting profile:', error);
      // Optional: Show error message
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUpdateProfile = async (id: string, profileData: Partial<ApiProfile>) => {
    setIsUpdating(true);
    try {
      await updateProfile(id, profileData);
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setIsUpdating(false);
    }
  };
  const handleDeleteAccount = async (id: string) => {
    const refreshToken = localStorage.getItem("refresh_token");

    // if (refreshToken) {
    //   try {
    //     await fetch("https://oauth2.googleapis.com/revoke", {
    //       method: "POST",
    //       headers: { "Content-Type": "application/x-www-form-urlencoded" },
    //       body: new URLSearchParams({ token: refreshToken }),
    //     });

    //     console.log("Refresh token revoked successfully");
    //     localStorage.removeItem("refresh_token");
    //     localStorage.removeItem("access_token");
    //   } catch (error) {
    //     console.error("Error revoking refresh token:", error);
    //   }
    // }

    removeAccount(id);
  };


  const openProxyDialog = (id: string) => {
    const account = accounts.find((a) => a.id === id);
    setSelectedAccountId(id);

    // Format proxy object into string format: host:port:username:password
    let proxyString = "";
    if (account?.proxy) {
      const { host, port, username, password } = account.proxy;
      proxyString = `${host}:${port}`;
      if (username) {
        proxyString += `:${username}`;
        if (password) {
          proxyString += `:${password}`;
        }
      }
    }

    setProxyValue(proxyString);
    setIsProxyDialogOpen(true);
  };

  const handleSaveProxy = () => {
    if (!selectedAccountId) {
      console.error("No selectedAccountId found");
      return;
    }
    updateAccountProxy(selectedAccountId, proxyValue);
    setIsProxyDialogOpen(false);
    setProxyValue("");
    setSelectedAccountId(null);
  };

  const handleVerifyAccount = (id: string) => {
    verifyAccount(id);
  };

  const handleRefreshToken = (id: string) => {
    refreshToken(id);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };
  const handleSetActiveProfile = async (id: string) => {
    try {

      await setActiveProfile(id);
      return true;
    } catch (error) {
      console.error('Failed to set active profile:', error);
      return false;
    }
  };
  const renderAccountCards = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      );
    }

    if (error) {
      return (
        <Card className="bg-muted/40">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-10 w-10 text-destructive mb-4" />
            <p className="text-muted-foreground mb-2">Failed to load accounts</p>
            <p className="text-sm text-center text-muted-foreground">{(error as Error).message}</p>
          </CardContent>
        </Card>
      );
    }

    if (accounts.length === 0) {
      return (
        <Card className="bg-muted/40">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">No YouTube accounts connected yet</p>
            <Button onClick={() => setIsAddAccountOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Add Your First Account
            </Button>
            <Button onClick={() => setIsProfileDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Create API Profile
            </Button>
          </CardContent>
        </Card>
      );
    }

    return accounts.map((account) => (
      <Card key={account.id} className="mb-4">
        <CardHeader className="pb-2">
          <div className="flex items-center">
            <Avatar className="mr-2 h-8 w-8">
              <AvatarImage src={account.thumbnailUrl} alt={account.channelTitle || account.email} />
              <AvatarFallback>
                {account.email.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-base font-medium">
                {account.channelTitle || account.email}
              </CardTitle>
              <p className="text-xs text-muted-foreground">{account.email}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 text-sm mt-2">
            {account.status === "active" ? (
              <div className="flex items-center">
                <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                <span>Active</span>
              </div>
            ) : (
              <div className="flex items-center">
                <XCircle className="mr-2 h-4 w-4 text-red-500" />
                <span>Inactive</span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="text-sm pb-4">
          <div className="grid gap-2">
            <div>
              <div className="text-muted-foreground mb-1">Proxy:</div>
              <div>{account?.proxy?.host && account.proxy.host}</div>

            </div>
            <div>
              <div className="text-muted-foreground mb-1">Connected Since:</div>
              <div>{formatDate(account.connectedDate)}</div>
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => toggleAccountStatus(account.id)}
                className="h-8 px-2"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                {account.status === "active" ? "Deactivate" : "Activate"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => openProxyDialog(account.id)}
                className="h-8 px-2"
              >
                <Link className="h-4 w-4 mr-2" />
                Proxy
              </Button>
              {/* <Button
                size="sm"
                variant="ghost"
                onClick={() => handleVerifyAccount(account.id)}
                className="h-8 px-2"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Verify
              </Button> */}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleDeleteAccount(account.id)}
                className="h-8 px-2"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    ));
  };

  const renderAccountTable = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="bg-muted/40 rounded-md border p-8 flex flex-col items-center justify-center">
          <AlertCircle className="h-10 w-10 text-destructive mb-4" />
          <p className="text-muted-foreground mb-2">Failed to load accounts</p>
          <p className="text-sm text-center text-muted-foreground">{(error as Error).message}</p>
        </div>
      );
    }

    if (accounts.length === 0) {
      return (
        <div className="bg-muted/40 rounded-md border p-8 flex flex-col items-center justify-center">
          <p className="text-muted-foreground mb-4">No YouTube accounts connected yet</p>
          <Button onClick={() => setIsAddAccountOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add Your First Account
          </Button>
        </div>
      );
    }

    return (
      <div className="rounded-md border">
        <ScrollArea className="max-h-[65vh]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>N°</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Profile Name</TableHead> {/* New column for Profile Name */}
                <TableHead>Status</TableHead>
                <TableHead>Proxy</TableHead>
                <TableHead>Connected Since</TableHead>
                <TableHead>Last Message</TableHead> {/* New column for lastMessage */}
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAccounts
                .slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
                .map((account, index) => {
                  // Find the profile name using the apiProfileId
                  const profile = profiles.find(profile => profile.id === account.apiProfileId);
                  const profileName = profile ? profile.name : "Unknown";

                  return (
                    <TableRow key={account.id}>
                      <TableCell>{(currentPage - 1) * ITEMS_PER_PAGE + index + 1}</TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Avatar className="mr-2 h-8 w-8">
                            <AvatarImage src={account.thumbnailUrl} alt={account.channelTitle || account.email} />
                            <AvatarFallback>
                              {account.email.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{account.channelTitle || account.email}</div>
                            <div className="text-xs text-muted-foreground">{account.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{profileName}</TableCell> {/* Display the profile name here */}
                      <TableCell>
                        {account.status === "active" ? (
                          <div className="flex items-center">
                            <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                            <span>Active</span>
                          </div>
                        ) : (
                          <div className="flex items-center">
                            <XCircle className="mr-2 h-4 w-4 text-red-500" />
                            <span>Inactive</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="truncate max-w-[200px]">
                          {account.proxy && account.proxy.host ? account.proxy.host : "None"}
                        </span>
                      </TableCell>
                      <TableCell>{formatDate(account.connectedDate)}</TableCell>
                      <TableCell>
                        <span className="whitespace-normal break-words max-w-[100px]">
                          {account.lastMessage || "No message available"}
                        </span>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={async () => {
                              try {
                                await toggleAccountStatus(account.id);
                                toast.success("Account status updated");
                              } catch (error: any) {
                                toast.error("Failed to toggle account", {
                                  description: error?.message || "Please try reconnecting your account.",
                                });
                                let Account_Auth_url = `https://accounts.google.com/o/oauth2/auth?client_id=${account.clientId}&redirect_uri=${account.redirectUri}&response_type=code&scope=openid%20email%20profile%20https://www.googleapis.com/auth/youtube.force-ssl&access_type=offline&prompt=consent`;

                                window.location.href = Account_Auth_url;
                              }
                            }}
                            className="h-8 px-2"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => openProxyDialog(account.id)}
                            title="Assign Proxy"
                          >
                            <Link className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDeleteAccount(account.id)}
                            title="Delete Account"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </ScrollArea>

        {/* Pagination Controls */}
        <div className="flex items-center justify-between px-4 py-2 border-t">
          <div className="text-sm text-muted-foreground">
            Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}-
            {Math.min(currentPage * ITEMS_PER_PAGE, filteredAccounts.length)} of {filteredAccounts.length} accounts
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <div className="flex items-center space-x-1">
              {Array.from({ length: Math.ceil(filteredAccounts.length / ITEMS_PER_PAGE) }, (_, i) => (
                <Button
                  key={i + 1}
                  variant={currentPage === i + 1 ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setCurrentPage(i + 1)}
                >
                  {i + 1}
                </Button>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(filteredAccounts.length / ITEMS_PER_PAGE)))}
              disabled={currentPage === Math.ceil(filteredAccounts.length / ITEMS_PER_PAGE)}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    );

  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Accounts</h1>
            <p className="text-muted-foreground">
              {selectedProfile
                ? `profile: ${selectedProfile.name}`
                : 'All Accounts'}
            </p>
            <select
              className="mt-2 p-2 border rounded"
              onChange={handleChange}
              value={selectedProfile ? selectedProfile.id : ''}
            >
              <option value="">Select a profile</option>
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name}
                </option>
              ))}
            </select>


          </div>

        </div>
        <div className="flex gap-2">  {/* Added a wrapper for buttons */}
          <Button onClick={() => setIsAddAccountOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add Account
          </Button>
          <Button onClick={() => setIsProfileDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Create API Profile
          </Button>
          <Button onClick={() => setIsProfileActiveDialogOpen(true)}>
            API Profile Management
          </Button>
        </div>
      </div>
      <div className="space-y-6">


        {/* Your existing content */}
        <ProfileSelectionDialog
          open={isProfileActiveDialogOpen}
          onOpenChange={setIsProfileActiveDialogOpen}
          profiles={profiles}
          activeProfileId={activeProfile?.id}
          onSelectProfile={handleSetActiveProfile}
          onDeleteProfile={handleDeleteProfile}
          onUpdateProfile={handleUpdateProfile}
          isLoading={isSettingActive}
          isDeleting={isDeleting}
          isUpdating={isUpdating}
        />
      </div>

      {isMobile ? renderAccountCards() : renderAccountTable()}

      <Dialog open={isAddAccountOpen} onOpenChange={setIsAddAccountOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add YouTube Account</DialogTitle>
            <DialogDescription>
              Connect a new YouTube account to use with the auto commenter.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <div>

                <a href={AUTH_URL} className="flex items-center justify-center gap-2 px-6 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-md transition duration-300">
                  <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google logo" className="w-5 h-5" />
                  <span className="font-medium">Login with Google</span>
                </a>


              </div>
              {/* <p className="text-sm text-center text-muted-foreground mt-4 mb-2">Optional settings</p> */}
            </div>
            {/* <div className="space-y-2">
              <Label htmlFor="proxy">Proxy Settings</Label>
              <Input
                id="proxy"
                placeholder="http://user:pass@host:port"
                value={proxyValue}
                onChange={(e) => setProxyValue(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Format: http://username:password@host:port
              </p>
            </div> */}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddAccountOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Manage APIs Dialog */}
      <ApiProfileDialog
        open={isProfileDialogOpen}
        onOpenChange={setIsProfileDialogOpen}
      />

      <Dialog open={isProxyDialogOpen} onOpenChange={setIsProxyDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Assign Proxy</DialogTitle>
            <DialogDescription>
              Update proxy settings for this YouTube account.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="edit-proxy">Proxy URL</Label>
            <Input
              id="edit-proxy"
              placeholder="http://user:pass@host:port"
              value={proxyValue}
              onChange={(e) => setProxyValue(e.target.value)}
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Format: http://username:password@host:port
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsProxyDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveProxy}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Accounts
