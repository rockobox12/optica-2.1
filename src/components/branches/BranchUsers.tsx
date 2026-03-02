import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, X, Shield, Stethoscope, User, Wallet } from 'lucide-react';

// Valid user roles - "vendedor" was removed and replaced by "Promotor" entity (non-user)
type AppRole = 'admin' | 'doctor' | 'asistente' | 'cobrador';

interface Branch {
  id: string;
  name: string;
}

interface BranchUser {
  user_id: string;
  full_name: string;
  email: string;
  roles: AppRole[];
}

interface AvailableUser {
  user_id: string;
  full_name: string;
  email: string;
}

interface BranchUsersProps {
  branch: Branch;
  onClose: () => void;
}

const roleIcons: Record<AppRole, React.ElementType> = {
  admin: Shield,
  doctor: Stethoscope,
  asistente: User,
  cobrador: Wallet,
};

const roleLabels: Record<AppRole, string> = {
  admin: 'Admin',
  doctor: 'Doctor',
  asistente: 'Asistente',
  cobrador: 'Cobrador',
};

export function BranchUsers({ branch, onClose }: BranchUsersProps) {
  const [users, setUsers] = useState<BranchUser[]>([]);
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [adding, setAdding] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchBranchUsers();
    fetchAvailableUsers();
  }, [branch.id]);

  const fetchBranchUsers = async () => {
    setLoading(true);
    
    // Get profiles assigned to this branch
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('user_id, full_name, email')
      .eq('default_branch_id', branch.id);

    if (error) {
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los usuarios',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    // Get roles for these users
    const userIds = (profiles || []).map(p => p.user_id);
    
    if (userIds.length > 0) {
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', userIds);

      const usersWithRoles: BranchUser[] = (profiles || []).map(p => ({
        ...p,
        roles: (roles || [])
          .filter(r => r.user_id === p.user_id)
          .map(r => r.role as AppRole),
      }));

      setUsers(usersWithRoles);
    } else {
      setUsers([]);
    }
    
    setLoading(false);
  };

  const fetchAvailableUsers = async () => {
    // Get all active profiles that are NOT assigned to this branch
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, full_name, email')
      .eq('is_active', true)
      .or(`default_branch_id.is.null,default_branch_id.neq.${branch.id}`);

    setAvailableUsers(profiles || []);
  };

  const assignUserToBranch = async () => {
    if (!selectedUserId) return;
    
    setAdding(true);

    const { error } = await supabase
      .from('profiles')
      .update({ default_branch_id: branch.id })
      .eq('user_id', selectedUserId);

    if (error) {
      toast({
        title: 'Error',
        description: 'No se pudo asignar el usuario a la sucursal',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Usuario asignado',
        description: 'El usuario ha sido asignado a esta sucursal',
      });
      setSelectedUserId('');
      fetchBranchUsers();
      fetchAvailableUsers();
    }
    
    setAdding(false);
  };

  const removeUserFromBranch = async (userId: string) => {
    const { error } = await supabase
      .from('profiles')
      .update({ default_branch_id: null })
      .eq('user_id', userId);

    if (error) {
      toast({
        title: 'Error',
        description: 'No se pudo remover el usuario de la sucursal',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Usuario removido',
        description: 'El usuario ha sido removido de esta sucursal',
      });
      fetchBranchUsers();
      fetchAvailableUsers();
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <div className="space-y-6">
      {/* Add User */}
      <div className="flex gap-2">
        <Select value={selectedUserId} onValueChange={setSelectedUserId}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Seleccionar usuario para asignar..." />
          </SelectTrigger>
          <SelectContent>
            {availableUsers.length === 0 ? (
              <div className="p-2 text-sm text-muted-foreground text-center">
                No hay usuarios disponibles
              </div>
            ) : (
              availableUsers.map(user => (
                <SelectItem key={user.user_id} value={user.user_id}>
                  <div className="flex flex-col">
                    <span>{user.full_name}</span>
                    <span className="text-xs text-muted-foreground">{user.email}</span>
                  </div>
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        <Button 
          onClick={assignUserToBranch} 
          disabled={!selectedUserId || adding}
          className="gap-2"
        >
          <UserPlus className="h-4 w-4" />
          Asignar
        </Button>
      </div>

      {/* Users List */}
      {loading ? (
        <div className="flex items-center justify-center p-8">
          <div className="h-6 w-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : users.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 text-center bg-secondary/30 rounded-lg">
          <User className="h-10 w-10 text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">No hay usuarios asignados a esta sucursal</p>
        </div>
      ) : (
        <div className="space-y-2">
          {users.map(user => (
            <div
              key={user.user_id}
              className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg hover:bg-secondary/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/10 text-primary text-sm">
                    {getInitials(user.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{user.full_name}</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  {user.roles.map(role => {
                    const Icon = roleIcons[role];
                    return (
                      <Badge key={role} variant="secondary" className="gap-1 text-xs">
                        <Icon className="h-3 w-3" />
                        {roleLabels[role]}
                      </Badge>
                    );
                  })}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => removeUserFromBranch(user.user_id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Close Button */}
      <div className="flex justify-end pt-4 border-t border-border">
        <Button variant="outline" onClick={onClose}>
          Cerrar
        </Button>
      </div>
    </div>
  );
}
