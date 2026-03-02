import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

const movementSchema = z.object({
  branch_id: z.string().min(1, 'Selecciona una sucursal'),
  quantity: z.coerce.number().int().min(1, 'La cantidad debe ser mayor a 0'),
  unit_cost: z.coerce.number().optional(),
  notes: z.string().optional(),
  transfer_branch_id: z.string().optional(),
});

type MovementFormData = z.infer<typeof movementSchema>;

interface StockMovementFormProps {
  product: any;
  movementType: 'entrada' | 'salida' | 'ajuste' | 'transferencia';
  branches: { id: string; name: string }[];
  onSuccess: () => void;
  onCancel: () => void;
}

export function StockMovementForm({
  product,
  movementType,
  branches,
  onSuccess,
  onCancel,
}: StockMovementFormProps) {
  const { toast } = useToast();
  const { user, profile } = useAuth();

  const form = useForm<MovementFormData>({
    resolver: zodResolver(movementSchema),
    defaultValues: {
      branch_id: profile?.defaultBranchId || '',
      quantity: 1,
      unit_cost: product.cost_price || undefined,
      notes: '',
      transfer_branch_id: '',
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: MovementFormData) => {
      const { error } = await supabase.rpc('update_inventory', {
        p_product_id: product.id,
        p_branch_id: data.branch_id,
        p_quantity: movementType === 'ajuste' ? data.quantity : Math.abs(data.quantity),
        p_movement_type: movementType,
        p_notes: data.notes || null,
        p_unit_cost: data.unit_cost || null,
        p_created_by: user?.id || null,
        p_transfer_branch_id: data.transfer_branch_id || null,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'Movimiento registrado',
        description: 'El inventario se actualizó correctamente',
      });
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
        <div className="bg-muted/50 p-4 rounded-lg mb-4">
          <p className="font-medium">{product.name}</p>
          <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>
        </div>

        <FormField
          control={form.control}
          name="branch_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sucursal *</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar sucursal" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {branches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {movementType === 'transferencia' && (
          <FormField
            control={form.control}
            name="transfer_branch_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sucursal destino *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar destino" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {branches
                      .filter((b) => b.id !== form.watch('branch_id'))
                      .map((branch) => (
                        <SelectItem key={branch.id} value={branch.id}>
                          {branch.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="quantity"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {movementType === 'ajuste' ? 'Nuevo stock' : 'Cantidad'} *
              </FormLabel>
              <FormControl>
                <Input {...field} type="number" min={movementType === 'ajuste' ? 0 : 1} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {movementType === 'entrada' && (
          <FormField
            control={form.control}
            name="unit_cost"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Costo unitario</FormLabel>
                <FormControl>
                  <Input {...field} type="number" step="0.01" min="0" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notas</FormLabel>
              <FormControl>
                <Textarea {...field} rows={2} placeholder="Motivo del movimiento..." />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Registrar movimiento
          </Button>
        </div>
      </form>
    </Form>
  );
}
