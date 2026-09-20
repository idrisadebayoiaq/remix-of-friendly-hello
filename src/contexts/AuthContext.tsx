import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  profile: any | null;
  isBanned: boolean;
  signUp: (email: string, password: string, metadata?: Record<string, any>) => Promise<any>;
  signIn: (email: string, password: string) => Promise<any>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any | null>(null);
  const [isBanned, setIsBanned] = useState(false);

  const fetchProfile = async (userId: string, retries = 3): Promise<any | null> => {
    for (let attempt = 0; attempt < retries; attempt++) {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (data) {
        if ((data as any).is_banned) {
          setProfile(data);
          setIsBanned(true);
          return data;
        }
        setProfile(data);
        setIsBanned(false);
        return data;
      }

      // Profile trigger may still be running right after signup
      if (attempt < retries - 1) {
        await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
      }
    }

    setProfile(null);
    setIsBanned(false);
    return null;
  };

  const ensureProfileFromSignup = async (
    userId: string,
    email: string,
    metadata?: Record<string, any>,
  ) => {
    const fullName = (metadata?.full_name || '').trim();
    const username = (metadata?.username || `user_${userId.slice(0, 8)}`)
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '') || `user_${userId.slice(0, 8)}`;

    // Give the DB trigger a moment, then fill any missing signup fields
    await new Promise((r) => setTimeout(r, 350));

    const { data: existing } = await supabase
      .from('profiles')
      .select('user_id, full_name, username, email')
      .eq('user_id', userId)
      .maybeSingle();

    if (!existing) {
      await supabase.from('profiles').insert({
        user_id: userId,
        email,
        full_name: fullName || 'Lovli User',
        username,
        relationship_status: 'single',
      } as any);
      return;
    }

    const patch: Record<string, string> = {};
    if (!existing.full_name?.trim() && fullName) patch.full_name = fullName;
    if ((!existing.username?.trim() || existing.username.startsWith('user_')) && username) {
      patch.username = username;
    }
    if (!existing.email?.trim() && email) patch.email = email;

    if (Object.keys(patch).length > 0) {
      await supabase.from('profiles').update(patch as any).eq('user_id', userId);
    }
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          setTimeout(() => fetchProfile(session.user.id), 0);
        } else {
          setProfile(null);
          setIsBanned(false);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`profile-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles', filter: `user_id=eq.${user.id}` },
        (payload) => {
          const nextProfile = payload.new as any;
          if (!nextProfile) return;
          setProfile(nextProfile);
          setIsBanned(!!nextProfile.is_banned);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const signUp = async (email: string, password: string, metadata?: Record<string, any>) => {
    const result = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: metadata?.full_name || '',
          username: metadata?.username || '',
        },
        emailRedirectTo: window.location.origin,
      },
    });

    if (!result.error && result.data.user) {
      await ensureProfileFromSignup(result.data.user.id, email, metadata);
      await fetchProfile(result.data.user.id, 5);
    }

    return result;
  };

  const signIn = async (email: string, password: string) => {
    return supabase.auth.signInWithPassword({ email, password });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setIsBanned(false);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, profile, isBanned, signUp, signIn, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
