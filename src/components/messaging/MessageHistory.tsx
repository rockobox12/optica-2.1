import { useState } from 'react';
import { 
  History, 
  MessageSquare, 
  Phone, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Send,
  Filter,
  Search,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  useAutoMessages, 
  MESSAGE_TYPE_CONFIG,
  type AutoMessageLog,
  type AutoMessageType
} from '@/hooks/useAutoMessages';
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  pending: { icon: <Clock className="h-3.5 w-3.5" />, label: 'Pendiente', color: 'text-warning' },
  sent: { icon: <Send className="h-3.5 w-3.5" />, label: 'Enviado', color: 'text-primary' },
  delivered: { icon: <CheckCircle className="h-3.5 w-3.5" />, label: 'Entregado', color: 'text-success' },
  failed: { icon: <XCircle className="h-3.5 w-3.5" />, label: 'Fallido', color: 'text-destructive' },
  cancelled: { icon: <XCircle className="h-3.5 w-3.5" />, label: 'Cancelado', color: 'text-muted-foreground' },
};

function LogsSkeleton() {
  return (
    <div className="space-y-2">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-3 border rounded-lg">
          <Skeleton className="h-8 w-8 rounded" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-6 w-20" />
        </div>
      ))}
    </div>
  );
}

function EmptyLogsState() {
  return (
    <div className="py-12 text-center">
      <History className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
      <h3 className="text-lg font-medium text-muted-foreground mb-1">
        Sin mensajes enviados
      </h3>
      <p className="text-sm text-muted-foreground/70">
        Aquí aparecerá el historial de mensajes automáticos.
      </p>
    </div>
  );
}

export function MessageHistory() {
  const { logs, logsLoading, fetchLogs } = useAutoMessages();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [channelFilter, setChannelFilter] = useState<string>('all');

  const filteredLogs = logs.filter((log) => {
    const matchesSearch = 
      search === '' ||
      log.recipient_name?.toLowerCase().includes(search.toLowerCase()) ||
      log.recipient_phone.includes(search) ||
      log.message_content.toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || log.status === statusFilter;
    const matchesType = typeFilter === 'all' || log.message_type === typeFilter;
    const matchesChannel = channelFilter === 'all' || log.channel === channelFilter;

    return matchesSearch && matchesStatus && matchesType && matchesChannel;
  });

  const stats = {
    total: logs.length,
    sent: logs.filter(l => l.status === 'sent' || l.status === 'delivered').length,
    failed: logs.filter(l => l.status === 'failed').length,
    pending: logs.filter(l => l.status === 'pending').length,
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            <CardTitle>Historial de Mensajes</CardTitle>
          </div>
          <Button variant="outline" size="sm" onClick={() => fetchLogs()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
        </div>
        <CardDescription>
          Registro de todos los mensajes automáticos enviados a clientes.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
          <div className="p-3 rounded-lg bg-success/10 text-center">
            <p className="text-2xl font-bold text-success">{stats.sent}</p>
            <p className="text-xs text-muted-foreground">Enviados</p>
          </div>
          <div className="p-3 rounded-lg bg-destructive/10 text-center">
            <p className="text-2xl font-bold text-destructive">{stats.failed}</p>
            <p className="text-xs text-muted-foreground">Fallidos</p>
          </div>
          <div className="p-3 rounded-lg bg-warning/10 text-center">
            <p className="text-2xl font-bold text-warning">{stats.pending}</p>
            <p className="text-xs text-muted-foreground">Pendientes</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, teléfono o mensaje..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending">Pendiente</SelectItem>
                <SelectItem value="sent">Enviado</SelectItem>
                <SelectItem value="delivered">Entregado</SelectItem>
                <SelectItem value="failed">Fallido</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                {Object.entries(MESSAGE_TYPE_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.icon} {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={channelFilter} onValueChange={setChannelFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Canal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="sms">SMS</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Table */}
        {logsLoading ? (
          <LogsSkeleton />
        ) : filteredLogs.length === 0 ? (
          <EmptyLogsState />
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Destinatario</TableHead>
                  <TableHead>Canal</TableHead>
                  <TableHead>Mensaje</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => {
                  const typeConfig = MESSAGE_TYPE_CONFIG[log.message_type];
                  const statusConfig = STATUS_CONFIG[log.status];

                  return (
                    <TableRow key={log.id}>
                      <TableCell>
                        <span className="text-lg" title={typeConfig?.label}>
                          {typeConfig?.icon || '📨'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{log.recipient_name || 'Sin nombre'}</p>
                          <p className="text-xs text-muted-foreground">{log.recipient_phone}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={log.channel === 'whatsapp' ? 'default' : 'secondary'} className="text-[10px]">
                          {log.channel === 'whatsapp' ? (
                            <MessageSquare className="h-3 w-3 mr-1" />
                          ) : (
                            <Phone className="h-3 w-3 mr-1" />
                          )}
                          {log.channel === 'whatsapp' ? 'WhatsApp' : 'SMS'}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[300px]">
                        <p className="text-sm truncate" title={log.message_content}>
                          {log.message_content}
                        </p>
                      </TableCell>
                      <TableCell>
                        <div className={cn('flex items-center gap-1.5 text-xs', statusConfig?.color)}>
                          {statusConfig?.icon}
                          {statusConfig?.label}
                        </div>
                        {log.error_message && (
                          <p className="text-[10px] text-destructive mt-0.5 truncate max-w-[150px]" title={log.error_message}>
                            {log.error_message}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-xs">
                          <p>{formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: es })}</p>
                          <p className="text-muted-foreground">
                            {format(new Date(log.created_at), 'd MMM, HH:mm', { locale: es })}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
