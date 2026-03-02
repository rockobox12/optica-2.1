import { User, Package, CreditCard, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export type POSStep = 'patient' | 'products' | 'payment';

interface POSStepIndicatorProps {
  currentStep: POSStep;
  onStepClick: (step: POSStep) => void;
  hasPatient: boolean;
  hasItems: boolean;
}

const steps = [
  { id: 'patient' as const, label: 'Cliente', icon: User },
  { id: 'products' as const, label: 'Productos', icon: Package },
  { id: 'payment' as const, label: 'Cobrar', icon: CreditCard },
];

export function POSStepIndicator({ currentStep, onStepClick, hasPatient, hasItems }: POSStepIndicatorProps) {
  const stepIndex = steps.findIndex(s => s.id === currentStep);

  const isStepComplete = (step: POSStep) => {
    if (step === 'patient') return hasPatient;
    if (step === 'products') return hasItems;
    return false;
  };

  const canNavigate = (step: POSStep) => {
    // Can always go back or stay; products requires nothing; payment requires items
    if (step === 'patient') return true;
    if (step === 'products') return true;
    if (step === 'payment') return hasItems;
    return false;
  };

  return (
    <div className="flex items-center justify-center gap-1 sm:gap-2 py-3">
      {steps.map((step, i) => {
        const isActive = step.id === currentStep;
        const isComplete = isStepComplete(step.id);
        const navigable = canNavigate(step.id);
        const Icon = isComplete && !isActive ? Check : step.icon;

        return (
          <div key={step.id} className="flex items-center">
            <button
              onClick={() => navigable && onStepClick(step.id)}
              disabled={!navigable}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition-all',
                isActive && 'bg-primary text-primary-foreground shadow-md scale-105',
                !isActive && isComplete && 'bg-primary/15 text-primary cursor-pointer hover:bg-primary/25',
                !isActive && !isComplete && navigable && 'bg-muted text-muted-foreground cursor-pointer hover:bg-muted/80',
                !isActive && !isComplete && !navigable && 'bg-muted/50 text-muted-foreground/50 cursor-not-allowed',
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{step.label}</span>
              <span className="sm:hidden text-xs">{i + 1}</span>
            </button>
            {i < steps.length - 1 && (
              <div className={cn(
                'w-6 sm:w-10 h-0.5 mx-1',
                i < stepIndex ? 'bg-primary' : 'bg-border',
              )} />
            )}
          </div>
        );
      })}
    </div>
  );
}
