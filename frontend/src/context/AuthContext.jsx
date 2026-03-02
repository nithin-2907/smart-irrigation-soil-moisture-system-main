import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import api from "../services/api";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);   // true while session loads

  // Sync Supabase user → MongoDB User collection
  const syncToMongo = async (supabaseUser) => {
    if (!supabaseUser) return null;
    try {
      const res = await api.post("/auth/sync", {
        supabaseId: supabaseUser.id,
        email: supabaseUser.email,
        name: supabaseUser.user_metadata?.name || supabaseUser.email.split("@")[0],
      });
      return res.data;  // MongoDB user with role, phone, location etc.
    } catch (err) {
      console.warn("MongoDB sync failed:", err.message);
      // Return a minimal user object so app still works
      return {
        email: supabaseUser.email,
        name: supabaseUser.user_metadata?.name || supabaseUser.email.split("@")[0],
        role: "farmer",
      };
    }
  };

  // On mount: restore session from Supabase (persists across refreshes)
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const mongoUser = await syncToMongo(session.user);
        setUser(mongoUser);
      }
      setLoading(false);
    });

    // Listen for auth state changes (login / logout / token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          const mongoUser = await syncToMongo(session.user);
          setUser(mongoUser);
        } else {
          setUser(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Sign up with email + password
  const signup = async (email, password, name) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    if (error) throw error;
  };

  // Login with email + password
  const login = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  // Logout
  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, signup }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);