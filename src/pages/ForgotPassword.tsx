
import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { api } from "@/lib/api-client";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast.error("Please enter your email address");
      return;
    }
    
    try {
      setIsLoading(true);
      // In a real app, this would call an API endpoint to send a password reset email
      await api.post("/auth/forgot-password", { email });
      setIsSubmitted(true);
      toast.success("Password reset link sent", {
        description: "Check your email for the password reset link",
      });
    } catch (error) {
      console.error("Password reset error:", error);
      toast.error("Failed to send reset link", {
        description: "Please check your email and try again",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-r from-blue-50 to-indigo-50 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-indigo-600">YouTube Comment Manager</h1>
          <p className="text-gray-600 mt-2">Reset your password</p>
        </div>
        
        <Card className="border-none shadow-lg">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl font-bold text-center">Forgot password</CardTitle>
            <CardDescription className="text-center">
              {isSubmitted 
                ? "We've sent you an email with instructions" 
                : "Enter your email address and we'll send you a link to reset your password"}
            </CardDescription>
          </CardHeader>
          
          {!isSubmitted ? (
            <form onSubmit={handleSubmit}>
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
                      Sending...
                    </div>
                  ) : (
                    "Send reset link"
                  )}
                </Button>
              </CardFooter>
            </form>
          ) : (
            <CardContent className="space-y-4 pt-4">
              <div className="bg-blue-50 text-blue-800 p-4 rounded-md text-sm">
                <p>We've sent an email to <span className="font-medium">{email}</span> with instructions to reset your password.</p>
                <p className="mt-2">If you don't see it, check your spam folder.</p>
              </div>
            </CardContent>
          )}
        </Card>
        
        <div className="mt-6 text-center">
          <p className="text-gray-600">
            <Link to="/login" className="text-indigo-600 hover:text-indigo-800 font-medium">
              Back to login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
