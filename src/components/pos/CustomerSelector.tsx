import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { normalizeSearchQuery, tokenizeQuery, buildBroadFilter, filterPatientByTokens } from '@/lib/patient-search';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';
import { EnhancedSearch, SearchResult } from '@/components/ui/EnhancedSearch';
import type { CustomerInfo } from '@/hooks/useOfflineSync';

interface CustomerSelectorProps {
  onSelect: (customer: CustomerInfo) => void;
  onCreateNew?: () => void;
}

export function CustomerSelector({ onSelect, onCreateNew }: CustomerSelectorProps) {
  const [showManual, setShowManual] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualPhone, setManualPhone] = useState('');
  const [manualEmail, setManualEmail] = useState('');

  // Search function for EnhancedSearch
  const handleSearch = useCallback(async (query: string): Promise<SearchResult[]> => {
    const normalized = normalizeSearchQuery(query);
    const tokens = tokenizeQuery(normalized);
    if (tokens.length === 0) return [];

    const broadFilter = buildBroadFilter(tokens);

    const { data, error } = await supabase
      .from('patients')
      .select(`
        id, 
        first_name, 
        last_name, 
        phone,
        mobile,
        whatsapp,
        email
      `)
      .eq('status', 'active')
      .or(broadFilter)
      .order('created_at', { ascending: false })
      .limit(30);

    if (error) throw error;

    // Client-side multi-token filtering for precision
    const filtered = (data || []).filter(p => filterPatientByTokens(p, tokens));

    return filtered.map((patient) => ({
      id: patient.id,
      type: 'customer' as const,
      name: `${patient.first_name} ${patient.last_name}`,
      phone: patient.whatsapp || patient.mobile || patient.phone || undefined,
      email: patient.email || undefined,
      metadata: { patientId: patient.id },
    }));
  }, []);

  // Handle patient selection
  const handleSelectPatient = useCallback((result: SearchResult) => {
    onSelect({
      patientId: result.id,
      name: result.name,
      phone: result.phone,
      email: result.email,
    });
  }, [onSelect]);

  const handleManualCustomer = () => {
    if (!manualName) return;
    onSelect({
      name: manualName,
      phone: manualPhone || undefined,
      email: manualEmail || undefined,
    });
    // Reset manual form
    setManualName('');
    setManualPhone('');
    setManualEmail('');
    setShowManual(false);
  };

  return (
    <div className="space-y-4">
      {/* Enhanced Search */}
      <EnhancedSearch
        placeholder="Buscar cliente por nombre, teléfono o email..."
        onSearch={handleSearch}
        onSelect={handleSelectPatient}
        onCreateNew={onCreateNew || (() => setShowManual(true))}
        minChars={2}
        maxResults={10}
        debounceMs={300}
        recentSearchesKey="pos-customers"
        autoFocus
      />

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            O ingrese manualmente
          </span>
        </div>
      </div>

      {/* Manual Entry */}
      {!showManual ? (
        <Button variant="outline" className="w-full" onClick={() => setShowManual(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Cliente sin registro
        </Button>
      ) : (
        <div className="space-y-3 p-3 border rounded-lg bg-card">
          <div>
            <Label>Nombre *</Label>
            <Input
              value={manualName}
              onChange={(e) => setManualName(e.target.value)}
              placeholder="Nombre del cliente"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Teléfono</Label>
              <Input
                value={manualPhone}
                onChange={(e) => setManualPhone(e.target.value)}
                placeholder="Teléfono"
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={manualEmail}
                onChange={(e) => setManualEmail(e.target.value)}
                placeholder="Email"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowManual(false)}>
              Cancelar
            </Button>
            <Button className="flex-1" onClick={handleManualCustomer} disabled={!manualName}>
              Seleccionar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
