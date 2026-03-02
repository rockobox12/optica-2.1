import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Save, Award, Medal, Crown, Gem, Star, Edit2 } from 'lucide-react';

const TIER_ICONS: Record<string, React.ElementType> = {
  Bronce: Award,
  Plata: Medal,
  Oro: Crown,
  Platino: Gem,
};

export function LoyaltySettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch program
  const { data: program, isLoading: loadingProgram } = useQuery({
    queryKey: ['loyalty-program-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('loyalty_programs')
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Fetch tiers
  const { data: tiers = [], isLoading: loadingTiers } = useQuery({
    queryKey: ['loyalty-tiers-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('loyalty_tiers')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return data;
    },
  });

  // Form state
  const [programForm, setProgramForm] = useState<any>(null);
  const [tierForms, setTierForms] = useState<any[]>([]);
  const [editingTier, setEditingTier] = useState<string | null>(null);

  // Initialize forms when data loads
  if (program && !programForm) {
    setProgramForm({
      name: program.name,
      description: program.description,
      points_per_peso: program.points_per_peso,
      peso_per_point: program.peso_per_point,
      min_redemption_points: program.min_redemption_points,
    });
  }

  if (tiers.length > 0 && tierForms.length === 0) {
    setTierForms(tiers.map(t => ({
      id: t.id,
      name: t.name,
      min_points: t.min_points,
      max_points: t.max_points,
      multiplier: t.multiplier,
      benefits: t.benefits,
      color: t.color,
    })));
  }

  // Update program mutation
  const updateProgramMutation = useMutation({
    mutationFn: async () => {
      if (!program) return;
      const { error } = await supabase
        .from('loyalty_programs')
        .update({
          name: programForm.name,
          description: programForm.description,
          points_per_peso: parseFloat(programForm.points_per_peso),
          peso_per_point: parseFloat(programForm.peso_per_point),
          min_redemption_points: parseInt(programForm.min_redemption_points),
          updated_at: new Date().toISOString(),
        })
        .eq('id', program.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loyalty-program'] });
      toast({ title: 'Configuración guardada' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Update tier mutation
  const updateTierMutation = useMutation({
    mutationFn: async (tierForm: any) => {
      const { error } = await supabase
        .from('loyalty_tiers')
        .update({
          name: tierForm.name,
          min_points: parseInt(tierForm.min_points),
          max_points: tierForm.max_points ? parseInt(tierForm.max_points) : null,
          multiplier: parseFloat(tierForm.multiplier),
          color: tierForm.color,
        })
        .eq('id', tierForm.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loyalty-tiers'] });
      setEditingTier(null);
      toast({ title: 'Nivel actualizado' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  if (loadingProgram || !programForm) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Program Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            Configuración del Programa
          </CardTitle>
          <CardDescription>
            Configura las reglas generales del programa de lealtad
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Nombre del programa</Label>
              <Input
                value={programForm.name}
                onChange={(e) => setProgramForm({ ...programForm, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Descripción</Label>
              <Input
                value={programForm.description || ''}
                onChange={(e) => setProgramForm({ ...programForm, description: e.target.value })}
              />
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Puntos por peso gastado</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={programForm.points_per_peso}
                onChange={(e) => setProgramForm({ ...programForm, points_per_peso: e.target.value })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Cliente gana {programForm.points_per_peso} pts por cada $1
              </p>
            </div>
            <div>
              <Label>Valor del punto (pesos)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={programForm.peso_per_point}
                onChange={(e) => setProgramForm({ ...programForm, peso_per_point: e.target.value })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Cada punto vale ${programForm.peso_per_point} al canjear
              </p>
            </div>
            <div>
              <Label>Mínimo para canje</Label>
              <Input
                type="number"
                min="1"
                value={programForm.min_redemption_points}
                onChange={(e) => setProgramForm({ ...programForm, min_redemption_points: e.target.value })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Puntos mínimos requeridos para canjear
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={() => updateProgramMutation.mutate()} disabled={updateProgramMutation.isPending}>
              <Save className="h-4 w-4 mr-2" />
              Guardar Configuración
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tiers Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Niveles de Membresía</CardTitle>
          <CardDescription>
            Configura los niveles y beneficios del programa
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {tierForms.map((tier) => {
              const TierIcon = TIER_ICONS[tier.name] || Star;
              const isEditing = editingTier === tier.id;

              return (
                <Card 
                  key={tier.id} 
                  className="relative overflow-hidden"
                  style={{ borderColor: tier.color }}
                >
                  <div 
                    className="absolute top-0 left-0 right-0 h-1"
                    style={{ backgroundColor: tier.color }}
                  />
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TierIcon className="h-5 w-5" style={{ color: tier.color }} />
                        {isEditing ? (
                          <Input
                            value={tier.name}
                            onChange={(e) => {
                              const updated = tierForms.map(t => 
                                t.id === tier.id ? { ...t, name: e.target.value } : t
                              );
                              setTierForms(updated);
                            }}
                            className="h-7 w-24"
                          />
                        ) : (
                          <CardTitle className="text-base">{tier.name}</CardTitle>
                        )}
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7"
                        onClick={() => setEditingTier(isEditing ? null : tier.id)}
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {isEditing ? (
                      <>
                        <div>
                          <Label className="text-xs">Puntos mínimos</Label>
                          <Input
                            type="number"
                            value={tier.min_points}
                            onChange={(e) => {
                              const updated = tierForms.map(t => 
                                t.id === tier.id ? { ...t, min_points: e.target.value } : t
                              );
                              setTierForms(updated);
                            }}
                            className="h-8"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Puntos máximos</Label>
                          <Input
                            type="number"
                            value={tier.max_points || ''}
                            onChange={(e) => {
                              const updated = tierForms.map(t => 
                                t.id === tier.id ? { ...t, max_points: e.target.value } : t
                              );
                              setTierForms(updated);
                            }}
                            placeholder="Sin límite"
                            className="h-8"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Multiplicador</Label>
                          <Input
                            type="number"
                            step="0.25"
                            min="1"
                            value={tier.multiplier}
                            onChange={(e) => {
                              const updated = tierForms.map(t => 
                                t.id === tier.id ? { ...t, multiplier: e.target.value } : t
                              );
                              setTierForms(updated);
                            }}
                            className="h-8"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Color</Label>
                          <Input
                            type="color"
                            value={tier.color}
                            onChange={(e) => {
                              const updated = tierForms.map(t => 
                                t.id === tier.id ? { ...t, color: e.target.value } : t
                              );
                              setTierForms(updated);
                            }}
                            className="h-8 p-1"
                          />
                        </div>
                        <Button 
                          size="sm" 
                          className="w-full"
                          onClick={() => updateTierMutation.mutate(tier)}
                          disabled={updateTierMutation.isPending}
                        >
                          Guardar
                        </Button>
                      </>
                    ) : (
                      <>
                        <div className="text-sm">
                          <span className="text-muted-foreground">Rango:</span>{' '}
                          {tier.min_points.toLocaleString()} - {tier.max_points?.toLocaleString() || '∞'} pts
                        </div>
                        <div className="text-sm">
                          <span className="text-muted-foreground">Multiplicador:</span>{' '}
                          <Badge variant="secondary">{tier.multiplier}x</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {Array.isArray(tier.benefits) && tier.benefits.length > 0 ? (
                            <ul className="list-disc list-inside space-y-1">
                              {(tier.benefits as string[]).slice(0, 3).map((b, i) => (
                                <li key={i}>{b}</li>
                              ))}
                              {(tier.benefits as string[]).length > 3 && (
                                <li>+{(tier.benefits as string[]).length - 3} más...</li>
                              )}
                            </ul>
                          ) : (
                            <span>Sin beneficios configurados</span>
                          )}
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
