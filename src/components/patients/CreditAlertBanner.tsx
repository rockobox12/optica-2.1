import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { AlertTriangle, DollarSign, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { QuickPaymentModal } from '@/components/cobro-rapido/QuickPaymentModal';
import { PaymentProbabilityBadge } from '@/components/patients/PaymentProbabilityBadge';
import { usePaymentProbability } from '@/hooks/usePaymentProbability';
import type { PatientCreditStatus, DelinquencyLevel } from '@/hooks/usePatientCreditStatus';

const LEVEL_CONFIG: Record<DelinquencyLevel, { label: string; color: string; icon: string; badgeClass: string }> = {
  active: { label: 'Activo', color: 'text-green-500', icon: '🟢', badgeClass: 'bg-green-100 text-green-800 border-green-200' },
  mild: { label: 'Atraso leve', color: 'text-yellow-500', icon: '🟡', badgeClass: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  moroso30: { label: 'Moroso 30+', color: 'text-red-500', icon: '🔴', badgeClass: 'bg-red-100 text-red-800 border-red-200' },
  critical: { label: 'Moroso crítico', color: 'text-gray-900 dark:text-gray-100', icon: '⚫', badgeClass: 'bg-gray-200 text-gray-900 border-gray-400' },
};

interface CreditSale {
  id: string;
  sale_number: string;
  customer_name: string | null;
  customer_phone: string | null;
  total: number;
  amount_paid: number;
  balance: number;
  credit_due_date: string | null;
  next_payment_date: string | null;
  next_payment_amount: number | null;
  created_at: string;
  patient_id: string | null;
  branch_id?: string | null;
  patients?: {
    id: string;
    first_name: string;
    last_name: string;
    phone: string | null;
    whatsapp: string | null;
  } | null;
  branches?: { name: string } | null;
}

interface CreditAlertBannerProps {
  status: PatientCreditStatus;
  patientId: string;
  patientName: string;
  compact?: boolean;
  showAIRecommendation?: boolean;
}

export function CreditAlertBanner({
  status,
  patientId,
  patientName,
  compact = false,
}: CreditAlertBannerProps) {
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [sales, setSales] = useState<CreditSale[]>([]);
  const [selectedSale, setSelectedSale] = useState<CreditSale | null>(null);
  const [loadingSales, setLoadingSales] = useState(false);
  const probability = usePaymentProbability(patientId);

  if (status.saldoPendienteTotal <= 0) return null;

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    try {
      return format(new Date(dateStr), 'dd/MM/yy', { locale: es });
    } catch {
      return dateStr;
    }
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return '—';
    return `$${amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleCobrarClick = async () => {
    setLoadingSales(true);
    const { data } = await supabase
      .from('sales')
      .select('id, sale_number, customer_name, customer_phone, total, amount_paid, balance, credit_due_date, next_payment_date, next_payment_amount, created_at, patient_id, patients(id, first_name, last_name, phone, whatsapp), branches(name)')
      .eq('patient_id', patientId)
      .gt('balance', 0)
      .order('next_payment_date', { ascending: true, nullsFirst: false });

    const salesData = (data || []) as unknown as CreditSale[];
    setSales(salesData);
    setLoadingSales(false);

    if (salesData.length === 1) {
      setSelectedSale(salesData[0]);
      setPaymentOpen(true);
    } else if (salesData.length > 1) {
      setSelectorOpen(true);
    }
  };

  const handleSelectSale = (sale: CreditSale) => {
    setSelectedSale(sale);
    setSelectorOpen(false);
    setPaymentOpen(true);
  };

  const handlePaymentSuccess = () => {
    setPaymentOpen(false);
    setSelectedSale(null);
    // creditStatus will refresh via its own effect
  };

  // Compact version for POS and table rows
  if (compact) {
    const levelCfg = LEVEL_CONFIG[status.delinquencyLevel];
    return (
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${
        status.delinquencyLevel === 'moroso30' || status.delinquencyLevel === 'critical'
          ? 'bg-destructive/10 border border-destructive/30'
          : status.delinquencyLevel === 'mild'
            ? 'bg-warning/10 border border-warning/30'
            : 'bg-muted/50 border border-border'
      }`}>
        {status.isMoroso ? (
          <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
        ) : (
          <DollarSign className="h-4 w-4 text-warning shrink-0" />
        )}
        <Badge className={`text-[10px] px-1.5 py-0 ${levelCfg.badgeClass}`}>
          {levelCfg.icon} {levelCfg.label}
        </Badge>
        <span className={status.isMoroso ? 'text-destructive font-medium' : 'text-warning font-medium'}>
          {status.isMoroso
            ? `${status.diasAtraso}d · ${status.overdueInstallments} cuota${status.overdueInstallments !== 1 ? 's' : ''} vencida${status.overdueInstallments !== 1 ? 's' : ''}`
            : `Saldo: ${formatCurrency(status.saldoPendienteTotal)}`
          }
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="ml-auto h-7 text-xs gap-1"
          onClick={handleCobrarClick}
          disabled={loadingSales}
        >
          Cobrar
        </Button>

        {/* Sale selector dialog */}
        <SaleSelector
          open={selectorOpen}
          onOpenChange={setSelectorOpen}
          sales={sales}
          onSelect={handleSelectSale}
          formatCurrency={formatCurrency}
          formatDate={formatDate}
        />

        {selectedSale && (
          <QuickPaymentModal
            open={paymentOpen}
            onOpenChange={setPaymentOpen}
            sale={selectedSale}
            onSuccess={handlePaymentSuccess}
          />
        )}
      </div>
    );
  }

  // Full banner — compact single-row design
    const levelCfg = LEVEL_CONFIG[status.delinquencyLevel];
    return (
    <>
      <div className={`expediente-credit-banner rounded-lg border px-4 py-2.5 ${
        status.delinquencyLevel === 'moroso30' || status.delinquencyLevel === 'critical'
          ? 'bg-destructive/5 border-destructive/30'
          : status.delinquencyLevel === 'mild'
            ? 'bg-warning/5 border-warning/30'
            : 'bg-muted/5 border-border'
      }`}>
        {/* Single row: icon + info + button */}
        <div className="flex items-center gap-3">
          {status.isMoroso ? (
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
          ) : (
            <DollarSign className="h-5 w-5 text-warning shrink-0" />
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className={`text-lg font-bold ${status.isMoroso ? 'text-destructive' : 'text-foreground'}`}>
                {formatCurrency(status.saldoPendienteTotal)}
              </span>
              <Badge className={`text-[10px] px-1.5 py-0 ${levelCfg.badgeClass}`}>
                {levelCfg.icon} {levelCfg.label}
              </Badge>
              {!probability.loading && (
                <PaymentProbabilityBadge score={probability.score} riskLevel={probability.riskLevel} compact showScore />
              )}
              {status.isMoroso && (
                <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                  {status.diasAtraso}d · {status.overdueInstallments} vencida{status.overdueInstallments !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
              <span>{status.salesWithBalance} venta{status.salesWithBalance !== 1 ? 's' : ''}</span>
              {status.overdueInstallments > 0 && (
                <>
                  <span className="text-border">|</span>
                  <span className="text-destructive">Vencido: {formatCurrency(status.overdueAmount)}</span>
                </>
              )}
              <span className="text-border">|</span>
              <span>Último pago: {status.lastPaymentDate ? formatDate(status.lastPaymentDate) : 'Sin pagos'}</span>
              <span className="text-border">|</span>
              <span className={status.isMoroso ? 'text-destructive' : ''}>
                Próx: {status.nextPaymentDate ? formatDate(status.nextPaymentDate) : '—'}
              </span>
            </div>
          </div>

          <Button
            type="button"
            size="sm"
            onClick={handleCobrarClick}
            disabled={loadingSales}
            className={`expediente-cobrar-btn shrink-0 gap-1.5 ${status.isMoroso ? 'bg-destructive hover:bg-destructive/90' : ''}`}
          >
            <DollarSign className="h-4 w-4" />
            Cobrar ahora
          </Button>
        </div>
      </div>

      {/* Sale selector dialog */}
      <SaleSelector
        open={selectorOpen}
        onOpenChange={setSelectorOpen}
        sales={sales}
        onSelect={handleSelectSale}
        formatCurrency={formatCurrency}
        formatDate={formatDate}
      />

      {selectedSale && (
        <QuickPaymentModal
          open={paymentOpen}
          onOpenChange={setPaymentOpen}
          sale={selectedSale}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </>
  );
}

// Sale selector for patients with multiple credits
function SaleSelector({
  open,
  onOpenChange,
  sales,
  onSelect,
  formatCurrency,
  formatDate,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  sales: CreditSale[];
  onSelect: (s: CreditSale) => void;
  formatCurrency: (n: number | null) => string;
  formatDate: (s: string | null) => string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Selecciona venta a cobrar</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 max-h-[50vh] overflow-y-auto">
          {sales.map((sale) => {
            const isOverdue = sale.next_payment_date && new Date(sale.next_payment_date) < new Date();
            return (
              <button
                key={sale.id}
                onClick={() => onSelect(sale)}
                className="w-full text-left p-3 rounded-lg border border-border hover:bg-secondary/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">Folio: {sale.sale_number}</span>
                  {isOverdue && (
                    <Badge variant="destructive" className="text-[10px]">Vencido</Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                  <span>Saldo: <strong className="text-foreground">{formatCurrency(sale.balance)}</strong></span>
                  <span>Próx: {formatDate(sale.next_payment_date)}</span>
                </div>
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
