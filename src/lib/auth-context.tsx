
import React, { createContext, useState, useEffect, useContext } from "react";
import { getCurrentUser, isAuthenticated as checkIsAuthenticated } from "./auth-service";

interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const loadUser = async () => {
      if (checkIsAuthenticated()) {
        try {
          const userData = await getCurrentUser();
          setUser(userData);
        } catch (error) {
          console.error("Failed to load user", error);
          setUser(null);
        }
      }
      setIsLoading(false);
    };
    
    loadUser();
  }, []);
  
  const value = {
    user,
    isLoading,
    isAuthenticated: Boolean(user) || checkIsAuthenticated(),
  };
  
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
