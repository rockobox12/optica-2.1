import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface ReceptionItem {
  order_item_id: string;
  product_id: string;
  product_name: string;
  sku: string;
  ordered: number;
  previously_received: number;
  pending: number;
  receiving: number;
  accepted: number;
  rejected: number;
  quality_status: 'pending' | 'approved' | 'rejected' | 'partial';
  rejection_reason: string;
}

interface ReceptionFormProps {
  orderId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function ReceptionForm({ orderId, onSuccess, onCancel }: ReceptionFormProps) {
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<ReceptionItem[]>([]);
  const { toast } = useToast();
  const { user, profile } = useAuth();

  const { data: orderItems, isLoading } = useQuery({
    queryKey: ['order-items-for-reception', orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchase_order_items')
        .select('*, products(name, sku)')
        .eq('purchase_order_id', orderId);
      if (error) throw error;

      // Initialize items state
      const initialItems: ReceptionItem[] = data.map((item: any) => ({
        order_item_id: item.id,
        product_id: item.product_id,
        product_name: item.products?.name || '',
        sku: item.products?.sku || '',
        ordered: item.quantity_ordered,
        previously_received: item.quantity_received,
        pending: item.quantity_ordered - item.quantity_received,
        receiving: item.quantity_ordered - item.quantity_received,
        accepted: item.quantity_ordered - item.quantity_received,
        rejected: 0,
        quality_status: 'approved' as const,
        rejection_reason: '',
      }));
      setItems(initialItems);

      return data;
    },
  });

  const updateItem = (index: number, field: keyof ReceptionItem, value: any) => {
    const newItems = [...items];
    (newItems[index] as any)[field] = value;

    // Auto-calculate accepted based on receiving and rejected
    if (field === 'receiving' || field === 'rejected') {
      const receiving = field === 'receiving' ? value : newItems[index].receiving;
      const rejected = field === 'rejected' ? value : newItems[index].rejected;
      newItems[index].accepted = Math.max(0, receiving - rejected);
      
      // Auto-set quality status
      if (rejected === 0) {
        newItems[index].quality_status = 'approved';
      } else if (newItems[index].accepted === 0) {
        newItems[index].quality_status = 'rejected';
      } else {
        newItems[index].quality_status = 'partial';
      }
    }

    setItems(newItems);
  };

  const mutation = useMutation({
    mutationFn: async () => {
      // Generate reception number
      const { data: receptionNumber, error: numError } = await supabase.rpc('generate_reception_number');
      if (numError) throw numError;

      // Create reception
      const { data: reception, error: recError } = await supabase
        .from('purchase_receptions')
        .insert([{
          purchase_order_id: orderId,
          reception_number: receptionNumber,
          received_by: user?.id,
          branch_id: profile?.defaultBranchId,
          notes: notes || null,
        }])
        .select()
        .single();

      if (recError) throw recError;

      // Create reception items
      for (const item of items) {
        if (item.receiving > 0) {
          const { data: recItem, error: itemError } = await supabase
            .from('purchase_reception_items')
            .insert([{
              reception_id: reception.id,
              order_item_id: item.order_item_id,
              product_id: item.product_id,
              quantity_received: item.receiving,
              quantity_accepted: item.accepted,
              quantity_rejected: item.rejected,
              quality_status: item.quality_status,
              rejection_reason: item.rejection_reason || null,
              inspected_by: user?.id,
              inspected_at: new Date().toISOString(),
            }])
            .select()
            .single();

          if (itemError) throw itemError;

          // Process reception and update inventory
          const { error: processError } = await supabase.rpc('process_reception_item', {
            p_reception_item_id: recItem.id,
            p_branch_id: profile?.defaultBranchId,
            p_received_by: user?.id,
          });

          if (processError) throw processError;
        }
      }
    },
    onSuccess: () => {
      toast({ title: 'Recepción registrada', description: 'El inventario se actualizó correctamente' });
      onSuccess();
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'rejected': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'partial': return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Producto</TableHead>
              <TableHead className="text-center">Ordenado</TableHead>
              <TableHead className="text-center">Pendiente</TableHead>
              <TableHead className="text-center">Recibiendo</TableHead>
              <TableHead className="text-center">Aceptados</TableHead>
              <TableHead className="text-center">Rechazados</TableHead>
              <TableHead className="text-center">Control</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, index) => (
              <TableRow key={item.order_item_id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{item.product_name}</p>
                    <p className="text-sm text-muted-foreground">{item.sku}</p>
                  </div>
                </TableCell>
                <TableCell className="text-center">{item.ordered}</TableCell>
                <TableCell className="text-center">
                  <Badge variant={item.pending > 0 ? 'secondary' : 'default'}>
                    {item.pending}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <Input
                    type="number"
                    min="0"
                    max={item.pending}
                    value={item.receiving}
                    onChange={(e) => updateItem(index, 'receiving', parseInt(e.target.value) || 0)}
                    className="w-20 text-center mx-auto"
                  />
                </TableCell>
                <TableCell className="text-center">
                  <span className="text-green-600 font-medium">{item.accepted}</span>
                </TableCell>
                <TableCell className="text-center">
                  <Input
                    type="number"
                    min="0"
                    max={item.receiving}
                    value={item.rejected}
                    onChange={(e) => updateItem(index, 'rejected', parseInt(e.target.value) || 0)}
                    className="w-20 text-center mx-auto"
                  />
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-2">
                    {getStatusIcon(item.quality_status)}
                    {item.rejected > 0 && (
                      <Input
                        placeholder="Motivo..."
                        value={item.rejection_reason}
                        onChange={(e) => updateItem(index, 'rejection_reason', e.target.value)}
                        className="w-32 text-sm"
                      />
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div>
        <label className="text-sm font-medium">Notas de recepción</label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Observaciones generales..."
        />
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || items.every((i) => i.receiving === 0)}
        >
          {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Confirmar Recepción
        </Button>
      </div>
    </div>
  );
}
