// src/context/auth-context.tsx
"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: "owner" | "employee";
  avatar_url: string | null;
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  userRole: "owner" | "employee" | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  userRole: null,
  loading: true,
  signIn: async () => {},
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setUserProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("users")
      .select("id, email, full_name, role, avatar_url")
      .eq("id", userId)
      .maybeSingle(); // Use maybeSingle instead of single

    if (error) {
      console.error("Error fetching user profile:", error);
    }

    if (data) {
      setUserProfile(data);
    } else {
      // User record doesn't exist - create it from auth metadata
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUserProfile({
          id: user.id,
          email: user.email || "",
          full_name:
            user.user_metadata?.full_name ||
            user.email?.split("@")[0] ||
            "User",
          role: "employee",
          avatar_url: null,
        });
      }
    }
    setLoading(false);
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchUserProfile(user.id);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    router.push("/dashboard");
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUserProfile(null);
    router.push("/login");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        userRole: userProfile?.role || null,
        loading,
        signIn,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
