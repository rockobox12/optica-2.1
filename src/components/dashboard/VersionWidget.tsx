import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { APP_CONFIG } from '@/config/app';
import { Info, History } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export function VersionWidget() {
  const [open, setOpen] = useState(false);

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

  return (
    <>
      <Card className="border-dashed">
        <CardContent className="p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Info className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">
                Versión actual: <Badge variant="secondary">{APP_CONFIG.appVersion}</Badge>
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
            <History className="h-4 w-4 mr-1" />
            Ver cambios
          </Button>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Registro de Versiones</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {versions?.map((v) => (
              <div key={v.id} className="p-4 rounded-lg border space-y-1">
                <div className="flex items-center justify-between">
                  <Badge>{v.version}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(v.created_at), "d MMM yyyy", { locale: es })}
                  </span>
                </div>
                <p className="font-medium text-sm">{v.title}</p>
                {v.notes && (
                  <p className="text-xs text-muted-foreground">{v.notes}</p>
                )}
              </div>
            ))}
            {(!versions || versions.length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Sin registros de versión
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
