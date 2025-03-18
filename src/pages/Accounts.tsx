
import { useState } from "react";
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
import { useYouTubeAccounts, YouTubeAccount } from "@/hooks/use-youtube-accounts";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";
import { jwtDecode } from "jwt-decode";

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
  const [isGoogleAuthLoading, setIsGoogleAuthLoading] = useState(false);
  const clientId = import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID;
  const handleGoogleSignIn = async (authResult: { credential: string }) => {
    try {
      setIsGoogleAuthLoading(true);
      
      if (!authResult.credential) {
        throw new Error("Authentication failed - no credential received");
      }
      
      // Decode the JWT token to get user info
      const decodedToken: any = jwtDecode(authResult.credential);
      console.log("Decoded token:", decodedToken);
      
      if (!decodedToken.email) {
        throw new Error("Email not found in the decoded token");
      }
      
      // Here we're getting the tokens from Google's response
      // In a real implementation, we'd exchange this credential for 
      // proper OAuth tokens on the backend, but for simplicity:
      addAccount({
        email: decodedToken.email,
        accessToken: authResult.credential, // This is just a placeholder
        refreshToken: "refresh_token", // This is just a placeholder
        proxy: proxyValue || undefined
      });
      
      setIsAddAccountOpen(false);
      setProxyValue("");
    } catch (error) {
      console.error("Google auth error", error);
      toast.error("Authentication failed", {
        description: (error as Error).message || "Could not connect to Google account.",
      });
    } finally {
      setIsGoogleAuthLoading(false);
    }
  };

  const handleDeleteAccount = (id: string) => {
    removeAccount(id);
  };

  const openProxyDialog = (id: string) => {
    const account = accounts.find((a) => a._id === id);
    setSelectedAccountId(id);
    setProxyValue(account?.proxy || "");
    setIsProxyDialogOpen(true);
  };

  const handleSaveProxy = () => {
    if (!selectedAccountId) return;
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
          </CardContent>
        </Card>
      );
    }
    
    return accounts.map((account) => (
      <Card key={account._id} className="mb-4">
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
              <div>{account.proxy || "None"}</div>
            </div>
            <div>
              <div className="text-muted-foreground mb-1">Connected Since:</div>
              <div>{formatDate(account.connectedDate)}</div>
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => toggleAccountStatus(account._id)}
                className="h-8 px-2"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                {account.status === "active" ? "Deactivate" : "Activate"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => openProxyDialog(account._id)}
                className="h-8 px-2"
              >
                <Link className="h-4 w-4 mr-2" />
                Proxy
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleVerifyAccount(account._id)}
                className="h-8 px-2"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Verify
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleDeleteAccount(account._id)}
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
                <TableHead>Channel</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Proxy</TableHead>
                <TableHead>Connected Since</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((account) => (
                <TableRow key={account._id}>
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
                    <span className="truncate max-w-[200px]">{account.proxy || "None"}</span>
                  </TableCell>
                  <TableCell>{formatDate(account.connectedDate)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => toggleAccountStatus(account._id)}
                        title={account.status === "active" ? "Deactivate" : "Activate"}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => openProxyDialog(account._id)}
                        title="Assign Proxy"
                      >
                        <Link className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleVerifyAccount(account._id)}
                        title="Verify Account"
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleRefreshToken(account._id)}
                        title="Refresh Token"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDeleteAccount(account._id)}
                        title="Delete Account"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0">
        <div>
          <h1 className="text-2xl font-bold">YouTube Accounts</h1>
          <p className="text-muted-foreground">Manage your connected YouTube channels</p>
        </div>
        <Button onClick={() => setIsAddAccountOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Account
        </Button>
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
              <GoogleOAuthProvider clientId={clientId}>
                <div className="w-full flex justify-center">
                  <GoogleLogin
                    onSuccess={handleGoogleSignIn}
                    onError={() => {
                      toast.error("Google Sign-In Failed", {
                        description: "Could not authenticate with Google. Please try again."
                      });
                    }}
                    useOneTap
                    theme="filled_blue"
                    text="signin_with"
                    shape="pill"
                    width="280px"
                  />
                </div>
              </GoogleOAuthProvider> 
              <p className="text-sm text-center text-muted-foreground mt-4 mb-2">Optional settings</p>
            </div>
            <div className="space-y-2">
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
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddAccountOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

export default Accounts;
