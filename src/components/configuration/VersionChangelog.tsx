import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export function VersionChangelog() {
  const { data: versions } = useQuery({
    queryKey: ['system-version-log'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_version_log')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  if (!versions || versions.length === 0) return null;

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-muted-foreground">Historial de Versiones</h4>
      {versions.map((v) => (
        <div key={v.id} className="p-3 rounded-lg border space-y-1">
          <div className="flex items-center justify-between">
            <Badge variant="outline">{v.version}</Badge>
            <span className="text-xs text-muted-foreground">
              {format(new Date(v.created_at), "d MMM yyyy", { locale: es })}
            </span>
          </div>
          <p className="text-sm font-medium">{v.title}</p>
          {v.notes && <p className="text-xs text-muted-foreground">{v.notes}</p>}
        </div>
      ))}
    </div>
  );
}
