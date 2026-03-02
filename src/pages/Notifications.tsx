import { useState } from 'react';
import { Bell, Check, CheckCheck, ExternalLink, Filter, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useNotifications, NOTIFICATION_CONFIG, type Notification, type NotificationType } from '@/hooks/useNotifications';
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { MainLayout } from '@/components/layout/MainLayout';

const NOTIFICATION_TYPES: { value: NotificationType | 'all'; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'order_ready', label: '🔔 Orden lista' },
  { value: 'low_stock', label: '⚠️ Stock bajo' },
  { value: 'appointment_soon', label: '📅 Cita próxima' },
  { value: 'high_value_sale', label: '💰 Venta alta' },
  { value: 'order_overdue', label: '🚨 Orden atrasada' },
  { value: 'vip_customer', label: '⭐ Cliente VIP' },
  { value: 'weekly_report', label: '📊 Reporte semanal' },
];

function NotificationRow({
  notification,
  onMarkAsRead,
  onDelete,
}: {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const navigate = useNavigate();
  const config = NOTIFICATION_CONFIG[notification.type];

  const handleClick = () => {
    if (!notification.is_read) {
      onMarkAsRead(notification.id);
    }
    if (notification.action_url) {
      navigate(notification.action_url);
    }
  };

  return (
    <div
      className={cn(
        'p-4 rounded-lg border transition-all cursor-pointer group',
        notification.is_read
          ? 'bg-muted/30 border-border hover:bg-muted/50'
          : 'bg-primary/5 border-primary/20 hover:bg-primary/10 shadow-sm'
      )}
      onClick={handleClick}
    >
      <div className="flex items-start gap-4">
        <div className="text-2xl flex-shrink-0">{config.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className={cn('text-sm', !notification.is_read && 'font-semibold')}>
              {notification.title}
            </h4>
            {!notification.is_read && (
              <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
            )}
          </div>
          {notification.description && (
            <p className="text-sm text-muted-foreground mb-2">{notification.description}</p>
          )}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>
              {formatDistanceToNow(new Date(notification.created_at), {
                addSuffix: true,
                locale: es,
              })}
            </span>
            <span>•</span>
            <span>{format(new Date(notification.created_at), "d MMM yyyy, HH:mm", { locale: es })}</span>
            {notification.action_url && notification.action_label && (
              <>
                <span>•</span>
                <span className="text-primary flex items-center gap-1">
                  {notification.action_label}
                  <ExternalLink className="h-3 w-3" />
                </span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {!notification.is_read && (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onMarkAsRead(notification.id);
              }}
            >
              <Check className="h-4 w-4 mr-1" />
              Leída
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(notification.id);
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function NotificationsSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="p-4 rounded-lg border bg-card">
          <div className="flex items-start gap-4">
            <Skeleton className="h-8 w-8 rounded" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-2/3" />
              <Skeleton className="h-3 w-1/4" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ type }: { type: 'all' | 'unread' | 'read' }) {
  const messages = {
    all: 'No tienes notificaciones aún',
    unread: 'No tienes notificaciones sin leer',
    read: 'No tienes notificaciones leídas',
  };

  return (
    <div className="py-16 text-center">
      <Bell className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-muted-foreground mb-2">{messages[type]}</h3>
      <p className="text-sm text-muted-foreground/70">
        Las notificaciones aparecerán aquí cuando haya actividad importante
      </p>
    </div>
  );
}

export default function Notifications() {
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();

  const [typeFilter, setTypeFilter] = useState<NotificationType | 'all'>('all');
  const [tab, setTab] = useState<'all' | 'unread' | 'read'>('all');

  const filteredNotifications = notifications.filter((n) => {
    const matchesType = typeFilter === 'all' || n.type === typeFilter;
    const matchesTab =
      tab === 'all' ||
      (tab === 'unread' && !n.is_read) ||
      (tab === 'read' && n.is_read);
    return matchesType && matchesTab;
  });

  const unreadFiltered = notifications.filter((n) => !n.is_read);
  const readFiltered = notifications.filter((n) => n.is_read);

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Notificaciones</h1>
            <p className="text-muted-foreground">
              {unreadCount > 0
                ? `Tienes ${unreadCount} notificación${unreadCount !== 1 ? 'es' : ''} sin leer`
                : 'Todas tus notificaciones están al día'}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" onClick={markAllAsRead}>
              <CheckCheck className="h-4 w-4 mr-2" />
              Marcar todas como leídas
            </Button>
          )}
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Historial de Notificaciones</CardTitle>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select
                  value={typeFilter}
                  onValueChange={(value) => setTypeFilter(value as NotificationType | 'all')}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filtrar por tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {NOTIFICATION_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
              <TabsList className="mb-4">
                <TabsTrigger value="all">
                  Todas ({notifications.length})
                </TabsTrigger>
                <TabsTrigger value="unread">
                  Sin leer ({unreadFiltered.length})
                </TabsTrigger>
                <TabsTrigger value="read">
                  Leídas ({readFiltered.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="m-0">
                {loading ? (
                  <NotificationsSkeleton />
                ) : filteredNotifications.length === 0 ? (
                  <EmptyState type="all" />
                ) : (
                  <div className="space-y-3">
                    {filteredNotifications.map((notification) => (
                      <NotificationRow
                        key={notification.id}
                        notification={notification}
                        onMarkAsRead={markAsRead}
                        onDelete={deleteNotification}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="unread" className="m-0">
                {loading ? (
                  <NotificationsSkeleton />
                ) : filteredNotifications.length === 0 ? (
                  <EmptyState type="unread" />
                ) : (
                  <div className="space-y-3">
                    {filteredNotifications.map((notification) => (
                      <NotificationRow
                        key={notification.id}
                        notification={notification}
                        onMarkAsRead={markAsRead}
                        onDelete={deleteNotification}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="read" className="m-0">
                {loading ? (
                  <NotificationsSkeleton />
                ) : filteredNotifications.length === 0 ? (
                  <EmptyState type="read" />
                ) : (
                  <div className="space-y-3">
                    {filteredNotifications.map((notification) => (
                      <NotificationRow
                        key={notification.id}
                        notification={notification}
                        onMarkAsRead={markAsRead}
                        onDelete={deleteNotification}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
