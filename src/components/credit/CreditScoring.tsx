import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Search, RefreshCw, TrendingUp, TrendingDown, AlertTriangle, Shield, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface CreditScore {
  id: string;
  patient_id: string;
  score: number;
  risk_level: string;
  credit_limit: number;
  available_credit: number;
  on_time_payments: number;
  late_payments: number;
  defaults: number;
  last_calculated_at: string;
  patients?: {
    first_name: string;
    last_name: string;
    phone: string | null;
    mobile: string | null;
  };
}

const getRiskColor = (level: string) => {
  switch (level) {
    case 'low': return 'bg-green-100 text-green-800';
    case 'medium': return 'bg-yellow-100 text-yellow-800';
    case 'high': return 'bg-orange-100 text-orange-800';
    case 'very_high': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getRiskLabel = (level: string) => {
  switch (level) {
    case 'low': return 'Bajo';
    case 'medium': return 'Medio';
    case 'high': return 'Alto';
    case 'very_high': return 'Muy Alto';
    default: return level;
  }
};

const getScoreColor = (score: number) => {
  if (score >= 800) return 'text-green-600';
  if (score >= 600) return 'text-yellow-600';
  if (score >= 400) return 'text-orange-600';
  return 'text-red-600';
};

export function CreditScoring() {
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch credit scores with patient data
  const { data: creditScores = [], isLoading } = useQuery({
    queryKey: ['credit-scores', searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('customer_credit_scores')
        .select(`
          *,
          patients (first_name, last_name, phone, mobile)
        `)
        .order('score', { ascending: true });

      const { data, error } = await query;
      if (error) throw error;
      
      // Filter by search term if provided
      if (searchTerm) {
        return (data as CreditScore[]).filter(score => {
          const fullName = `${score.patients?.first_name} ${score.patients?.last_name}`.toLowerCase();
          return fullName.includes(searchTerm.toLowerCase());
        });
      }
      
      return data as CreditScore[];
    },
  });

  // Recalculate score mutation
  const recalculateScore = useMutation({
    mutationFn: async (patientId: string) => {
      const { data, error } = await supabase.rpc('calculate_credit_score', {
        p_patient_id: patientId,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (score, patientId) => {
      toast({
        title: 'Score recalculado',
        description: `Nuevo score: ${score}`,
      });
      queryClient.invalidateQueries({ queryKey: ['credit-scores'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Calculate stats
  const avgScore = creditScores.length > 0 
    ? Math.round(creditScores.reduce((sum, s) => sum + s.score, 0) / creditScores.length)
    : 0;
  const highRiskCount = creditScores.filter(s => s.risk_level === 'high' || s.risk_level === 'very_high').length;
  const totalCreditLimit = creditScores.reduce((sum, s) => sum + Number(s.credit_limit), 0);

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <Shield className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Clientes con Score</p>
                <p className="text-xl font-bold">{creditScores.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Score Promedio</p>
                <p className={`text-xl font-bold ${getScoreColor(avgScore)}`}>{avgScore}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Alto Riesgo</p>
                <p className="text-xl font-bold text-red-600">{highRiskCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100">
                <TrendingDown className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Límite Total</p>
                <p className="text-xl font-bold">${totalCreditLimit.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre de cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Credit Scores Table */}
      <Card>
        <CardHeader>
          <CardTitle>Scoring Crediticio</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : creditScores.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No hay scores crediticios registrados
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-center">Score</TableHead>
                  <TableHead>Riesgo</TableHead>
                  <TableHead className="text-right">Límite</TableHead>
                  <TableHead className="text-right">Disponible</TableHead>
                  <TableHead className="text-center">Pagos</TableHead>
                  <TableHead>Último Cálculo</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {creditScores.map((score) => (
                  <TableRow key={score.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {score.patients?.first_name} {score.patients?.last_name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {score.patients?.mobile || score.patients?.phone || 'Sin teléfono'}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col items-center gap-1">
                        <span className={`text-lg font-bold ${getScoreColor(score.score)}`}>
                          {score.score}
                        </span>
                        <Progress 
                          value={score.score / 10} 
                          className="w-16 h-2"
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getRiskColor(score.risk_level)}>
                        {getRiskLabel(score.risk_level)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ${Number(score.credit_limit).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={Number(score.available_credit) > 0 ? 'text-green-600' : 'text-red-600'}>
                        ${Number(score.available_credit).toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2 justify-center text-sm">
                        <span className="text-green-600">✓{score.on_time_payments}</span>
                        <span className="text-orange-600">⚠{score.late_payments}</span>
                        <span className="text-red-600">✗{score.defaults}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(score.last_calculated_at), 'dd/MM/yy HH:mm', { locale: es })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => recalculateScore.mutate(score.patient_id)}
                        disabled={recalculateScore.isPending}
                      >
                        {recalculateScore.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
