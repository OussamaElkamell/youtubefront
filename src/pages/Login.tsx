
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { loginUser } from "@/lib/auth-service";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }
    
    try {
      setIsLoading(true);
      await loginUser({ email, password });
      navigate("/dashboard");
    } catch (error) {
      console.error("Login error:", error);
      // Toast is already handled in the auth service
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-r from-blue-50 to-indigo-50 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-indigo-600">YouTube Comment Manager</h1>
          <p className="text-gray-600 mt-2">Sign in to your account</p>
        </div>
        
        <Card className="border-none shadow-lg">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl font-bold text-center">Welcome back</CardTitle>
            <CardDescription className="text-center">
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleLogin}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-700">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="name@example.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="border-gray-200 focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                  required
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-gray-700">Password</Label>
                  <Link 
                    to="/forgot-password" 
                    className="text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
                <Input 
                  id="password" 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="border-gray-200 focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                  required
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                type="submit" 
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Signing in...
                  </div>
                ) : (
                  "Sign in"
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
        
        <div className="mt-6 text-center">
          <p className="text-gray-600">
            Don't have an account?{" "}
            <span className="text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer">
              Contact your administrator
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
