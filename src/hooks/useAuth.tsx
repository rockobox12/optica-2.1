import { useState, useEffect, createContext, useContext, ReactNode, useRef, useCallback } from 'react';
import { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

// Valid user roles - 'admin' kept as TS alias for backward compat (maps to super_admin at runtime)
type AppRole = 'super_admin' | 'admin' | 'gerente' | 'doctor' | 'optometrista' | 'asistente' | 'cobrador' | 'tecnico';
type AccessEventType = 'login_success' | 'login_failed' | 'logout' | 'password_reset_requested' | 'password_reset_completed' | 'session_expired' | 'account_locked' | 'permission_denied';

interface UserProfile {
  userId: string;
  fullName: string;
  isActive: boolean;
  defaultBranchId: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  rolesLoaded: boolean;
  profileLoaded: boolean;
  roles: AppRole[];
  profile: UserProfile | null;
  signIn: (email: string, password: string) => Promise<{ error: Error | null; isInactive?: boolean }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
  hasRole: (role: AppRole) => boolean;
  hasAnyRole: (roles: AppRole[]) => boolean;
  isAdmin: () => boolean;
  isSuperAdmin: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Session verification interval: 30 minutes
const SESSION_VERIFY_INTERVAL = 30 * 60 * 1000;

// Helper to log access events
async function logAccessEvent(
  userId: string | null,
  email: string,
  eventType: AccessEventType,
  metadata: Record<string, string | number | boolean | null> = {}
) {
  try {
    await supabase.rpc('log_access_event', {
      _user_id: userId,
      _email: email,
      _event_type: eventType,
      _ip_address: null,
      _user_agent: navigator.userAgent,
      _branch_id: null,
      _metadata: metadata as unknown as Record<string, never>,
    });
  } catch (error) {
    console.error('Error logging access event:', error);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  // These help ProtectedRoute avoid rendering null/redirecting before roles/profile arrive.
  const [rolesLoaded, setRolesLoaded] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);
  
  // Refs to track state and prevent unnecessary re-fetches
  const lastUserId = useRef<string | null>(null);
  const lastVerifyTime = useRef<number>(0);
  const isInitialized = useRef(false);
  const rolesLoadedRef = useRef(false);
  const profileLoadedRef = useRef(false);

  // Memoized fetch functions to avoid re-creating on each render
  const fetchUserRoles = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (!error && data) {
        setRoles(data.map(r => r.role as AppRole));
      } else if (error) {
        console.error('Error fetching roles:', error);
        setRoles([]);
      }
    } finally {
      setRolesLoaded(true);
    }
  }, []);

  const fetchUserProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, is_active, default_branch_id')
        .eq('user_id', userId)
        .maybeSingle();

      if (!error && data) {
        setProfile({
          userId: data.user_id,
          fullName: data.full_name,
          isActive: data.is_active,
          defaultBranchId: data.default_branch_id,
        });
      } else if (error) {
        console.error('Error fetching profile:', error);
        setProfile(null);
      }
    } finally {
      setProfileLoaded(true);
    }
  }, []);

  // Keep latest loaded flags in refs to avoid re-subscribing auth listener
  useEffect(() => {
    rolesLoadedRef.current = rolesLoaded;
    profileLoadedRef.current = profileLoaded;
  }, [rolesLoaded, profileLoaded]);

  useEffect(() => {
    // IMPORTANT: Prevent session auto-refresh from tying into tab visibility/focus.
    // We'll refresh manually at most every 30 minutes instead.
    try {
      supabase.auth.stopAutoRefresh();
    } catch {
      // ignore - method may not exist in some builds
    }

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, newSession) => {
        const now = Date.now();
        const newUserId = newSession?.user?.id ?? null;

        // Always keep local state in sync (even if we skip heavy work)
        setSession(newSession);
        setUser(newSession?.user ?? null);

        // Skip redundant work for same-user refreshes within the interval
        if (
          (event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') &&
          lastUserId.current === newUserId &&
          newUserId !== null &&
          (now - lastVerifyTime.current) < SESSION_VERIFY_INTERVAL
        ) {
          lastVerifyTime.current = now;
          return;
        }

        // Same user: never reset profile/roles on refresh events
        const sameUser = lastUserId.current === newUserId && newUserId !== null;
        if (sameUser) {
          lastVerifyTime.current = now;
          return;
        }

        // Only fetch roles/profile for new users or significant auth changes
        if (newSession?.user) {
          setRolesLoaded(false);
          setProfileLoaded(false);
          lastUserId.current = newUserId;

          setTimeout(() => {
            void Promise.all([
              fetchUserRoles(newSession.user.id),
              fetchUserProfile(newSession.user.id),
            ]).then(() => {
              lastVerifyTime.current = now;
            });
          }, 0);
        } else {
          // User signed out
          setRoles([]);
          setProfile(null);
          setRolesLoaded(true);
          setProfileLoaded(true);
          lastUserId.current = null;
        }
      }
    );

    // Check for existing session on mount
    if (!isInitialized.current) {
      isInitialized.current = true;

      supabase.auth.getSession().then(async ({ data: { session: existingSession } }) => {
        setSession(existingSession);
        setUser(existingSession?.user ?? null);

        if (existingSession?.user) {
          lastUserId.current = existingSession.user.id;
          setRolesLoaded(false);
          setProfileLoaded(false);

          await Promise.all([
            fetchUserRoles(existingSession.user.id),
            fetchUserProfile(existingSession.user.id),
          ]);

          lastVerifyTime.current = Date.now();
        } else {
          setRolesLoaded(true);
          setProfileLoaded(true);
        }
        setLoading(false);
      });
    }

    // Manual session verification (max once per 30 minutes, only while visible)
    const interval = window.setInterval(async () => {
      const now = Date.now();
      if (!lastUserId.current) return;
      if (document.visibilityState !== 'visible') return;
      if ((now - lastVerifyTime.current) < SESSION_VERIFY_INTERVAL) return;

      try {
        const { data, error } = await supabase.auth.refreshSession();
        if (error) {
          console.warn('Auth: manual refreshSession failed', error);
          return;
        }
        if (data?.session) {
          setSession(data.session);
          setUser(data.session.user);
          lastVerifyTime.current = now;

          // If for some reason roles/profile were not loaded, fetch them once.
          if (!rolesLoadedRef.current || !profileLoadedRef.current) {
            setRolesLoaded(false);
            setProfileLoaded(false);
            await Promise.all([
              fetchUserRoles(data.session.user.id),
              fetchUserProfile(data.session.user.id),
            ]);
          }
        }
      } catch (e) {
        console.warn('Auth: manual refreshSession exception', e);
      }
    }, 60_000); // check every minute; refresh only when interval passed

    return () => {
      window.clearInterval(interval);
      subscription.unsubscribe();
      try {
        supabase.auth.startAutoRefresh();
      } catch {
        // ignore
      }
    };
  }, [fetchUserRoles, fetchUserProfile]);

  // fetchUserRoles and fetchUserProfile are defined above as useCallback

  const checkUserActiveStatus = async (email: string): Promise<{ isActive: boolean; userId: string | null }> => {
    const { data, error } = await supabase
      .rpc('get_profile_by_email', { _email: email });

    if (error || !data || data.length === 0) {
      return { isActive: true, userId: null }; // Default to true if not found (new user)
    }

    return { isActive: data[0].is_active, userId: data[0].user_id };
  };

  const signIn = async (email: string, password: string) => {
    // First check if user is active
    const { isActive, userId } = await checkUserActiveStatus(email);
    
    if (!isActive) {
      // Log failed login attempt for inactive user
      await logAccessEvent(userId, email, 'account_locked', {
        reason: 'Usuario inactivo intentó iniciar sesión'
      });
      
      return { 
        error: new Error('Tu cuenta está desactivada. Contacta al administrador.'),
        isInactive: true 
      };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // Log failed login
      await logAccessEvent(userId, email, 'login_failed', {
        errorMessage: error.message
      });
      return { error };
    }

    // Log successful login
    if (data.user) {
      await logAccessEvent(data.user.id, email, 'login_success', {
        loginMethod: 'email_password'
      });
    }

    return { error: null };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });
    return { error };
  };

  const signOut = async () => {
    // Log logout event before signing out
    if (user) {
      await logAccessEvent(user.id, user.email || '', 'logout', {});
    }
    
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRoles([]);
    setProfile(null);
  };

  const resetPassword = async (email: string) => {
    const redirectUrl = `${window.location.origin}/auth/reset-password`;
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });

    if (!error) {
      // Log password reset request
      const { userId } = await checkUserActiveStatus(email);
      await logAccessEvent(userId, email, 'password_reset_requested', {});
    }

    return { error };
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (!error && user) {
      // Log password reset completion
      await logAccessEvent(user.id, user.email || '', 'password_reset_completed', {});
    }

    return { error };
  };

  // Backward compat: checking 'admin' also matches 'super_admin'
  const hasRole = (role: AppRole) => {
    if (role === ('admin' as AppRole)) return roles.includes('super_admin') || roles.includes(role);
    return roles.includes(role);
  };
  
  const hasAnyRole = (checkRoles: AppRole[]) => checkRoles.some(role => hasRole(role));
  
  const isAdmin = () => roles.includes('super_admin');
  const isSuperAdmin = () => roles.includes('super_admin');

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        rolesLoaded,
        profileLoaded,
        roles,
        profile,
        signIn,
        signUp,
        signOut,
        resetPassword,
        updatePassword,
        hasRole,
        hasAnyRole,
        isAdmin,
        isSuperAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
