import { MaskedDateInput } from '@/components/ui/MaskedDateInput';
import { Label } from '@/components/ui/label';

interface BirthDatePickerProps {
  value: string; // ISO format: yyyy-MM-dd
  onChange: (value: string) => void;
  error?: string;
}

export function BirthDatePicker({ value, onChange, error }: BirthDatePickerProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
      <div className="md:col-span-2">
        <MaskedDateInput
          value={value}
          onChange={onChange}
          error={error}
          label="Fecha de nacimiento"
          mode="birthdate"
          showAge={false}
        />
      </div>
      
      <div className="space-y-2">
        <Label>Edad</Label>
        <div className="h-11 flex items-center px-3 rounded-md border bg-muted/50 text-muted-foreground">
          {value ? (() => {
            const date = new Date(value + 'T00:00:00');
            if (isNaN(date.getTime())) return '—';
            const today = new Date();
            let age = today.getFullYear() - date.getFullYear();
            const monthDiff = today.getMonth() - date.getMonth();
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
              age--;
            }
            return `${age} años`;
          })() : '—'}
        </div>
      </div>
    </div>
  );
}
