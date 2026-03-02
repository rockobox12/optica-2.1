import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export type AuthorizationActionType = 
  | 'CHANGE_PRICE'
  | 'APPLY_DISCOUNT'
  | 'EDIT_USER'
  | 'DELETE_USER'
  | 'EDIT_PATIENT'
  | 'DELETE_PATIENT'
  | 'EDIT_PRODUCT'
  | 'DELETE_PRODUCT'
  | 'INVENTORY_ADJUSTMENT'
  | 'CHANGE_CREDIT_SETTINGS'
  | 'CHANGE_CONFIG';

export type AuthorizationRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';

export interface AuthorizationRequest {
  id: string;
  requested_by_user_id: string;
  requested_by_role: string;
  action_type: AuthorizationActionType;
  resource_type: string;
  resource_id: string | null;
  resource_description: string | null;
  action_data: Record<string, any> | null;
  comment: string | null;
  status: AuthorizationRequestStatus;
  admin_comment: string | null;
  approved_by_user_id: string | null;
  approved_at: string | null;
  executed_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  requester_name?: string;
  approver_name?: string;
}

export const ACTION_TYPE_LABELS: Record<AuthorizationActionType, string> = {
  CHANGE_PRICE: 'Cambiar precio',
  APPLY_DISCOUNT: 'Aplicar descuento',
  EDIT_USER: 'Editar usuario',
  DELETE_USER: 'Eliminar usuario',
  EDIT_PATIENT: 'Editar paciente',
  DELETE_PATIENT: 'Eliminar paciente',
  EDIT_PRODUCT: 'Editar producto',
  DELETE_PRODUCT: 'Eliminar producto',
  INVENTORY_ADJUSTMENT: 'Ajuste de inventario',
  CHANGE_CREDIT_SETTINGS: 'Cambiar config. de crédito',
  CHANGE_CONFIG: 'Cambiar configuración',
};

export const RESOURCE_TYPE_LABELS: Record<string, string> = {
  user: 'Usuario',
  patient: 'Paciente',
  product: 'Producto',
  sale: 'Venta',
  inventory: 'Inventario',
  config: 'Configuración',
  credit: 'Crédito',
};

export function useAdminAuthorization() {
  const { user, hasAnyRole, roles } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [pendingAction, setPendingAction] = useState<{
    actionType: AuthorizationActionType;
    resourceType: string;
    resourceId?: string;
    resourceDescription?: string;
    actionData?: Record<string, any>;
    onApproved?: () => void;
  } | null>(null);

  const isAdmin = hasAnyRole(['admin']);

  // Get pending requests count for admin badge
  const { data: pendingCount = 0 } = useQuery({
    queryKey: ['auth-requests-count'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_pending_auth_requests_count');
      if (error) throw error;
      return data || 0;
    },
    enabled: isAdmin,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Get all pending requests for admin panel
  const { data: pendingRequests = [], isLoading: loadingRequests, refetch: refetchRequests } = useQuery({
    queryKey: ['auth-requests-pending'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_authorization_requests')
        .select('*')
        .eq('status', 'PENDING')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Fetch requester names
      const userIds = [...new Set(data.map((r: any) => r.requested_by_user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);
      
      const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);
      
      return data.map((r: any) => ({
        ...r,
        requester_name: profileMap.get(r.requested_by_user_id) || 'Usuario desconocido',
      })) as AuthorizationRequest[];
    },
    enabled: isAdmin,
  });

  // Get user's own requests
  const { data: myRequests = [], isLoading: loadingMyRequests } = useQuery({
    queryKey: ['auth-requests-mine'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_authorization_requests')
        .select('*')
        .eq('requested_by_user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data as AuthorizationRequest[];
    },
    enabled: !!user?.id,
  });

  // Create authorization request
  const createRequestMutation = useMutation({
    mutationFn: async ({
      actionType,
      resourceType,
      resourceId,
      resourceDescription,
      actionData,
      comment,
    }: {
      actionType: AuthorizationActionType;
      resourceType: string;
      resourceId?: string;
      resourceDescription?: string;
      actionData?: Record<string, any>;
      comment?: string;
    }) => {
      const currentRole = roles[0] || 'usuario';
      
      const { data, error } = await supabase
        .from('admin_authorization_requests')
        .insert({
          requested_by_user_id: user?.id,
          requested_by_role: currentRole,
          action_type: actionType,
          resource_type: resourceType,
          resource_id: resourceId || null,
          resource_description: resourceDescription || null,
          action_data: actionData || null,
          comment: comment || null,
        })
        .select()
        .single();
      
      if (error) {
        if (error.code === '23505') {
          throw new Error('Ya existe una solicitud pendiente para esta acción');
        }
        throw error;
      }
      
      return data;
    },
    onSuccess: () => {
      toast({
        title: 'Solicitud enviada',
        description: 'Un administrador revisará tu solicitud.',
      });
      queryClient.invalidateQueries({ queryKey: ['auth-requests-mine'] });
      queryClient.invalidateQueries({ queryKey: ['auth-requests-count'] });
      setPendingAction(null);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error al enviar solicitud',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Approve request (admin only)
  const approveRequestMutation = useMutation({
    mutationFn: async ({
      requestId,
      adminComment,
    }: {
      requestId: string;
      adminComment?: string;
    }) => {
      const { error } = await supabase
        .from('admin_authorization_requests')
        .update({
          status: 'APPROVED',
          approved_by_user_id: user?.id,
          approved_at: new Date().toISOString(),
          admin_comment: adminComment || null,
        })
        .eq('id', requestId)
        .eq('status', 'PENDING');
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'Solicitud aprobada',
        description: 'El usuario puede ahora ejecutar la acción.',
      });
      queryClient.invalidateQueries({ queryKey: ['auth-requests-pending'] });
      queryClient.invalidateQueries({ queryKey: ['auth-requests-count'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error al aprobar',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Reject request (admin only)
  const rejectRequestMutation = useMutation({
    mutationFn: async ({
      requestId,
      adminComment,
    }: {
      requestId: string;
      adminComment?: string;
    }) => {
      const { error } = await supabase
        .from('admin_authorization_requests')
        .update({
          status: 'REJECTED',
          approved_by_user_id: user?.id,
          approved_at: new Date().toISOString(),
          admin_comment: adminComment || null,
        })
        .eq('id', requestId)
        .eq('status', 'PENDING');
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'Solicitud rechazada',
        description: 'Se ha notificado al usuario.',
      });
      queryClient.invalidateQueries({ queryKey: ['auth-requests-pending'] });
      queryClient.invalidateQueries({ queryKey: ['auth-requests-count'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error al rechazar',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Check if action requires authorization and handle it
  const checkAuthorization = useCallback(async (
    actionType: AuthorizationActionType,
    resourceType: string,
    resourceId?: string,
    resourceDescription?: string,
    actionData?: Record<string, any>,
    onApproved?: () => void,
  ): Promise<boolean> => {
    // Admins are always authorized
    if (isAdmin) {
      return true;
    }
    
    // Check if there's an approved but not executed request
    const { data: requests } = await supabase
      .from('admin_authorization_requests')
      .select('id, status')
      .eq('requested_by_user_id', user?.id)
      .eq('action_type', actionType)
      .eq('resource_type', resourceType)
      .eq('resource_id', resourceId || null)
      .in('status', ['PENDING', 'APPROVED'])
      .is('executed_at', null)
      .gt('expires_at', new Date().toISOString())
      .limit(1);
    
    if (requests && requests.length > 0) {
      const request = requests[0];
      
      if (request.status === 'APPROVED') {
        // Mark as executed and allow
        await supabase.rpc('mark_authorization_executed', { p_request_id: request.id });
        return true;
      }
      
      if (request.status === 'PENDING') {
        toast({
          title: 'Solicitud pendiente',
          description: 'Ya tienes una solicitud pendiente para esta acción. Espera la aprobación del administrador.',
        });
        return false;
      }
    }
    
    // Show authorization modal
    setPendingAction({
      actionType,
      resourceType,
      resourceId,
      resourceDescription,
      actionData,
      onApproved,
    });
    
    return false;
  }, [isAdmin, user?.id, toast]);

  const submitRequest = useCallback((comment?: string) => {
    if (!pendingAction) return;
    
    createRequestMutation.mutate({
      actionType: pendingAction.actionType,
      resourceType: pendingAction.resourceType,
      resourceId: pendingAction.resourceId,
      resourceDescription: pendingAction.resourceDescription,
      actionData: pendingAction.actionData,
      comment,
    });
  }, [pendingAction, createRequestMutation]);

  const cancelRequest = useCallback(() => {
    setPendingAction(null);
  }, []);

  return {
    // State
    isAdmin,
    pendingCount,
    pendingRequests,
    myRequests,
    loadingRequests,
    loadingMyRequests,
    pendingAction,
    
    // Actions
    checkAuthorization,
    submitRequest,
    cancelRequest,
    approveRequest: approveRequestMutation.mutate,
    rejectRequest: rejectRequestMutation.mutate,
    refetchRequests,
    
    // Loading states
    isSubmitting: createRequestMutation.isPending,
    isApproving: approveRequestMutation.isPending,
    isRejecting: rejectRequestMutation.isPending,
  };
}
