import { useState } from 'react';
import { AlertTriangle, User, Phone, Calendar, ExternalLink, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import type { DuplicateMatch } from '@/lib/duplicate-detection';

interface DuplicateAlertProps {
  matches: DuplicateMatch[];
  onSelectPatient: (patientId: string) => void;
  onContinueCreating: () => void;
  onLogIgnored: (matchedPatientId: string, score: number, reasons: string[]) => void;
}

export function DuplicateAlert({
  matches,
  onSelectPatient,
  onContinueCreating,
  onLogIgnored,
}: DuplicateAlertProps) {
  const [confirmed, setConfirmed] = useState(false);
  
  if (matches.length === 0) return null;

  const hasHighScore = matches.some(m => m.score >= 90);
  const highestScore = matches[0]?.score || 0;

  const handleContinue = () => {
    // Log all matches as ignored
    matches.forEach(m => onLogIgnored(m.patient.id, m.score, m.reasons));
    onContinueCreating();
  };

  const formatAge = (birthDate: string | null) => {
    if (!birthDate) return null;
    const birth = new Date(birthDate);
    const today = new Date();
    const age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      return age - 1;
    }
    return age;
  };

  const maskPhone = (phone: string | null): string => {
    if (!phone) return '';
    const digits = phone.replace(/\D/g, '');
    if (digits.length >= 10) {
      const last4 = digits.slice(-4);
      return `****${last4}`;
    }
    return phone;
  };

  return (
    <div className="rounded-lg border-2 border-warning bg-warning/5 p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
      {/* Header */}
      <div className="flex items-start gap-2">
        <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
        <div>
          <h4 className="font-semibold text-foreground">
            {highestScore >= 90 ? 'Probable paciente duplicado' : 'Posible paciente duplicado'}
          </h4>
          <p className="text-sm text-muted-foreground mt-0.5">
            Se encontraron {matches.length} registro{matches.length > 1 ? 's' : ''} similar{matches.length > 1 ? 'es' : ''}
          </p>
        </div>
      </div>

      {/* Match list */}
      <div className="space-y-2">
        {matches.slice(0, 5).map((match) => {
          const age = formatAge(match.patient.birth_date);
          const displayPhone = match.patient.whatsapp || match.patient.mobile || match.patient.phone;
          
          return (
            <div
              key={match.patient.id}
              className="flex items-center justify-between gap-3 p-3 rounded-md border border-border bg-card hover:bg-accent/50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm truncate">
                    {match.patient.first_name} {match.patient.last_name}
                  </span>
                  <Badge 
                    variant={match.score >= 90 ? 'destructive' : 'secondary'}
                    className="text-xs shrink-0"
                  >
                    {match.score}%
                  </Badge>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                  {age !== null && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {age} años
                    </span>
                  )}
                  {displayPhone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {maskPhone(displayPhone)}
                    </span>
                  )}
                </div>
                {/* Reasons */}
                <div className="flex gap-1 mt-1.5 flex-wrap">
                  {match.reasons.map((reason, i) => (
                    <Badge key={i} variant="outline" className="text-xs font-normal py-0">
                      {reason}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="flex gap-1.5 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs h-8"
                  onClick={() => onSelectPatient(match.patient.id)}
                >
                  <User className="h-3 w-3 mr-1" />
                  Usar este
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Continue creating */}
      <div className="pt-2 border-t border-border/50 space-y-2">
        {hasHighScore && (
          <div className="flex items-start gap-2">
            <Checkbox
              id="confirm-not-duplicate"
              checked={confirmed}
              onCheckedChange={(checked) => setConfirmed(!!checked)}
            />
            <label
              htmlFor="confirm-not-duplicate"
              className="text-xs text-muted-foreground cursor-pointer leading-tight"
            >
              Confirmo que NO es el mismo paciente y deseo crear un registro nuevo.
            </label>
          </div>
        )}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-xs"
          onClick={handleContinue}
          disabled={hasHighScore && !confirmed}
        >
          Continuar creando nuevo paciente
        </Button>
      </div>
    </div>
  );
}
