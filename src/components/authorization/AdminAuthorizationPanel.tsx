import { useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  CheckCircle2,
  XCircle,
  Clock,
  User,
  ShieldCheck,
  AlertCircle,
  Eye,
  RefreshCw,
} from 'lucide-react';
import {
  useAdminAuthorization,
  ACTION_TYPE_LABELS,
  RESOURCE_TYPE_LABELS,
  type AuthorizationRequest,
} from '@/hooks/useAdminAuthorization';

export function AdminAuthorizationPanel() {
  const {
    pendingRequests,
    loadingRequests,
    approveRequest,
    rejectRequest,
    refetchRequests,
    isApproving,
    isRejecting,
  } = useAdminAuthorization();

  const [selectedRequest, setSelectedRequest] = useState<AuthorizationRequest | null>(null);
  const [adminComment, setAdminComment] = useState('');
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);

  const handleAction = (request: AuthorizationRequest, action: 'approve' | 'reject') => {
    setSelectedRequest(request);
    setActionType(action);
    setAdminComment('');
  };

  const confirmAction = () => {
    if (!selectedRequest || !actionType) return;

    if (actionType === 'approve') {
      approveRequest({ requestId: selectedRequest.id, adminComment: adminComment || undefined });
    } else {
      rejectRequest({ requestId: selectedRequest.id, adminComment: adminComment || undefined });
    }

    setSelectedRequest(null);
    setActionType(null);
    setAdminComment('');
  };

  const closeDialog = () => {
    setSelectedRequest(null);
    setActionType(null);
    setAdminComment('');
  };

  if (loadingRequests) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Solicitudes de Autorización
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              Solicitudes de Autorización
            </CardTitle>
            <CardDescription>
              {pendingRequests.length} solicitud{pendingRequests.length !== 1 ? 'es' : ''} pendiente{pendingRequests.length !== 1 ? 's' : ''}
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetchRequests()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
        </CardHeader>
        <CardContent>
          {pendingRequests.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No hay solicitudes pendientes</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Solicitante</TableHead>
                    <TableHead>Acción</TableHead>
                    <TableHead>Recurso</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{request.requester_name}</p>
                            <p className="text-xs text-muted-foreground capitalize">
                              {request.requested_by_role}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {ACTION_TYPE_LABELS[request.action_type] || request.action_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm">
                            {RESOURCE_TYPE_LABELS[request.resource_type] || request.resource_type}
                          </p>
                          {request.resource_description && (
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {request.resource_description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(request.created_at), {
                            addSuffix: true,
                            locale: es,
                          })}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleAction(request, 'approve')}
                            className="text-success hover:text-success hover:bg-success/10"
                            title="Aprobar"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleAction(request, 'reject')}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            title="Rechazar"
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionType === 'approve' ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-success" />
                  Aprobar Solicitud
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-destructive" />
                  Rechazar Solicitud
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'approve'
                ? 'El usuario podrá ejecutar la acción solicitada una sola vez.'
                : 'Se notificará al usuario que su solicitud fue rechazada.'}
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4 py-4">
              {/* Request details */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Solicitante:</span>
                  <span className="font-medium">{selectedRequest.requester_name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Acción:</span>
                  <Badge variant="outline">
                    {ACTION_TYPE_LABELS[selectedRequest.action_type]}
                  </Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Recurso:</span>
                  <span>{selectedRequest.resource_description || RESOURCE_TYPE_LABELS[selectedRequest.resource_type]}</span>
                </div>
                {selectedRequest.comment && (
                  <div className="pt-2 border-t border-border">
                    <span className="text-xs text-muted-foreground">Motivo del solicitante:</span>
                    <p className="text-sm mt-1 italic">"{selectedRequest.comment}"</p>
                  </div>
                )}
              </div>

              {/* Admin comment */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Comentario (opcional)
                </label>
                <Textarea
                  placeholder={
                    actionType === 'approve'
                      ? 'Ej: Aprobado para caso excepcional...'
                      : 'Ej: No se permite esta acción porque...'
                  }
                  value={adminComment}
                  onChange={(e) => setAdminComment(e.target.value)}
                  rows={2}
                  className="resize-none"
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={closeDialog}
              disabled={isApproving || isRejecting}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button
              onClick={confirmAction}
              disabled={isApproving || isRejecting}
              variant={actionType === 'approve' ? 'default' : 'destructive'}
              className="w-full sm:w-auto"
            >
              {actionType === 'approve' ? (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  {isApproving ? 'Aprobando...' : 'Confirmar Aprobación'}
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  {isRejecting ? 'Rechazando...' : 'Confirmar Rechazo'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
