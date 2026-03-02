import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Branch {
  id: string;
  name: string;
  is_main: boolean;
}

/** 'all' = super_admin viewing all branches (no filter) */
type ActiveBranch = string | 'all';

interface BranchContextType {
  /** List of available branches */
  branches: Branch[];
  /** Currently selected branch id, or 'all' */
  activeBranchId: ActiveBranch;
  /** Resolved branch object (null when 'all') */
  activeBranch: Branch | null;
  /** Whether the user can switch branches */
  canSwitchBranch: boolean;
  /** Change the active branch */
  setActiveBranch: (id: ActiveBranch) => void;
  /** Helper: returns branch_id filter value for queries. undefined = no filter */
  branchFilter: string | undefined;
  /** Loading state */
  loading: boolean;
}

const BranchContext = createContext<BranchContextType | undefined>(undefined);

export function BranchProvider({ children }: { children: ReactNode }) {
  const { user, roles, profile, rolesLoaded, profileLoaded } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [activeBranchId, setActiveBranchId] = useState<ActiveBranch>('');
  const [loading, setLoading] = useState(true);

  const isSuperAdmin = roles.includes('super_admin');

  // Fetch branches
  useEffect(() => {
    if (!user) {
      setBranches([]);
      setActiveBranchId('');
      setLoading(false);
      return;
    }

    const fetchBranches = async () => {
      const { data } = await supabase
        .from('branches')
        .select('id, name, is_main')
        .eq('is_active', true)
        .order('is_main', { ascending: false })
        .order('name');

      if (data && data.length > 0) {
        setBranches(data);
      }
      setLoading(false);
    };

    fetchBranches();
  }, [user]);

  // Set initial active branch based on role
  useEffect(() => {
    if (!rolesLoaded || !profileLoaded || branches.length === 0) return;

    if (isSuperAdmin) {
      // Restore from localStorage or default to 'all'
      const stored = localStorage.getItem('activeBranchId');
      if (stored && (stored === 'all' || branches.some(b => b.id === stored))) {
        setActiveBranchId(stored);
      } else {
        setActiveBranchId('all');
      }
    } else {
      // Non-admin: lock to their assigned branch
      const userBranch = profile?.defaultBranchId;
      if (userBranch && branches.some(b => b.id === userBranch)) {
        setActiveBranchId(userBranch);
      } else {
        // Fallback to main branch
        const main = branches.find(b => b.is_main);
        setActiveBranchId(main?.id || branches[0].id);
      }
    }
  }, [rolesLoaded, profileLoaded, branches, isSuperAdmin, profile?.defaultBranchId]);

  const handleSetActiveBranch = useCallback((id: ActiveBranch) => {
    if (!isSuperAdmin && id === 'all') return; // Only super_admin can select 'all'
    setActiveBranchId(id);
    if (isSuperAdmin) {
      localStorage.setItem('activeBranchId', id);
    }
  }, [isSuperAdmin]);

  const activeBranch = activeBranchId === 'all' 
    ? null 
    : branches.find(b => b.id === activeBranchId) || null;

  const branchFilter = activeBranchId === 'all' ? undefined : activeBranchId || undefined;

  const canSwitchBranch = isSuperAdmin;

  return (
    <BranchContext.Provider
      value={{
        branches,
        activeBranchId,
        activeBranch,
        canSwitchBranch,
        setActiveBranch: handleSetActiveBranch,
        branchFilter,
        loading,
      }}
    >
      {children}
    </BranchContext.Provider>
  );
}

export function useBranch() {
  const context = useContext(BranchContext);
  if (!context) {
    throw new Error('useBranch must be used within a BranchProvider');
  }
  return context;
}
