import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  MessageCircle, 
  Phone, 
  Copy, 
  Clock,
  User,
  RefreshCw,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';

interface ContactEvent {
  id: string;
  event_type: string;
  channel: string;
  phone_used: string | null;
  created_at: string;
  user_id: string;
  profiles?: {
    full_name: string | null;
  };
}

interface ContactHistoryProps {
  patientId: string;
  maxItems?: number;
  refreshTrigger?: number;
}

// Mapeo de tipos de evento a textos legibles
const EVENT_LABELS: Record<string, string> = {
  'WHATSAPP_OPENED': 'Abrió WhatsApp',
  'WHATSAPP_COPIED': 'Copió WhatsApp',
  'CALL_STARTED': 'Inició llamada',
  'PHONE_COPIED': 'Copió teléfono',
};

// Mapeo de canales a iconos
function getChannelIcon(channel: string) {
  switch (channel) {
    case 'WHATSAPP':
      return <MessageCircle className="h-4 w-4 text-green-600" />;
    case 'CALL':
      return <Phone className="h-4 w-4 text-blue-600" />;
    case 'COPY':
      return <Copy className="h-4 w-4 text-muted-foreground" />;
    default:
      return <Clock className="h-4 w-4" />;
  }
}

// Mapeo de canales a colores de badge
function getChannelBadge(channel: string) {
  switch (channel) {
    case 'WHATSAPP':
      return <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">WhatsApp</Badge>;
    case 'CALL':
      return <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">Llamada</Badge>;
    case 'COPY':
      return <Badge variant="secondary">Copia</Badge>;
    default:
      return <Badge variant="outline">{channel}</Badge>;
  }
}

export function ContactHistory({ patientId, maxItems = 20, refreshTrigger }: ContactHistoryProps) {
  const [events, setEvents] = useState<ContactEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = async () => {
    setLoading(true);
    setError(null);

    try {
      // Obtener eventos con información del usuario
      const { data, error: fetchError } = await supabase
        .from('contact_events')
        .select(`
          id,
          event_type,
          channel,
          phone_used,
          created_at,
          user_id
        `)
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })
        .limit(maxItems);

      if (fetchError) throw fetchError;

      // Obtener nombres de usuarios
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(e => e.user_id))];
        
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', userIds);

        const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);
        
        const eventsWithProfiles = data.map(event => ({
          ...event,
          profiles: { full_name: profileMap.get(event.user_id) || 'Usuario' },
        }));

        setEvents(eventsWithProfiles);
      } else {
        setEvents([]);
      }
    } catch (err) {
      console.error('Error fetching contact events:', err);
      setError('Error al cargar historial');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [patientId, refreshTrigger]);

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Historial de contacto
          </h4>
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 p-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-destructive">{error}</p>
        <Button variant="ghost" size="sm" onClick={fetchEvents} className="mt-2 gap-2">
          <RefreshCw className="h-4 w-4" />
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Historial de contacto
        </h4>
        <Button variant="ghost" size="sm" onClick={fetchEvents} className="h-8 w-8 p-0">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {events.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground">
          <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Sin eventos aún</p>
          <p className="text-xs">Los eventos de contacto aparecerán aquí</p>
        </div>
      ) : (
        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-3">
            {events.map((event) => (
              <div
                key={event.id}
                className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="mt-0.5">
                  {getChannelIcon(event.channel)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">
                      {EVENT_LABELS[event.event_type] || event.event_type}
                    </span>
                    {getChannelBadge(event.channel)}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <User className="h-3 w-3" />
                    <span>{event.profiles?.full_name || 'Usuario'}</span>
                    <span>•</span>
                    <span>
                      {format(new Date(event.created_at), "dd MMM yyyy 'a las' HH:mm", { locale: es })}
                    </span>
                  </div>
                  {event.phone_used && (
                    <p className="text-xs text-muted-foreground mt-1 font-mono">
                      {event.phone_used}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
