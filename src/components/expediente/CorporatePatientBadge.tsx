import { Building2, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CorporatePatientBadgeProps {
  homeBranchId: string | null;
  currentBranchId: string | null;
  activeBranchId: string | undefined;
}

export function CorporatePatientBadge({ homeBranchId, currentBranchId, activeBranchId }: CorporatePatientBadgeProps) {
  const [homeBranchName, setHomeBranchName] = useState<string | null>(null);
  const [currentBranchName, setCurrentBranchName] = useState<string | null>(null);
  const [isFromOtherBranch, setIsFromOtherBranch] = useState(false);

  useEffect(() => {
    const fetchNames = async () => {
      const ids = [homeBranchId, currentBranchId].filter(Boolean) as string[];
      if (ids.length === 0) return;

      const { data } = await supabase
        .from('branches')
        .select('id, name')
        .in('id', ids);

      if (data) {
        const map = Object.fromEntries(data.map(b => [b.id, b.name]));
        setHomeBranchName(homeBranchId ? map[homeBranchId] || null : null);
        setCurrentBranchName(currentBranchId ? map[currentBranchId] || null : null);
      }
    };

    fetchNames();
  }, [homeBranchId, currentBranchId]);

  useEffect(() => {
    setIsFromOtherBranch(
      !!activeBranchId && !!homeBranchId && activeBranchId !== homeBranchId
    );
  }, [activeBranchId, homeBranchId]);

  if (!isFromOtherBranch || !homeBranchName) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent/50 border border-accent text-sm">
      <Building2 className="h-4 w-4 text-primary flex-shrink-0" />
      <span>
        Paciente de <strong>{homeBranchName}</strong>
        {currentBranchName && currentBranchName !== homeBranchName && (
          <>
            {' '}– atendido en <strong>{currentBranchName}</strong>
          </>
        )}
      </span>
      <Badge variant="outline" className="ml-auto text-xs gap-1">
        <MapPin className="h-3 w-3" />
        Corporativo
      </Badge>
    </div>
  );
}
