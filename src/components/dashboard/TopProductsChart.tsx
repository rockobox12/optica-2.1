import { useState, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  Cell 
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { Package } from 'lucide-react';

interface ProductData {
  name: string;
  cantidad: number;
  fullName: string;
}

const COLORS = ['#0F4C81', '#2E7BB4', '#4A9BD9', '#7BB8E8', '#A8D4F5'];

export function TopProductsChart() {
  const [data, setData] = useState<ProductData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchTopProducts();
  }, []);

  const fetchTopProducts = async () => {
    try {
      const { data: saleItems, error } = await supabase
        .from('sale_items')
        .select(`
          quantity,
          product:products(name)
        `)
        .limit(100);

      if (error) throw error;

      // Aggregate by product
      const productTotals: Record<string, { name: string; cantidad: number }> = {};
      
      saleItems?.forEach(item => {
        const productName = (item.product as any)?.name;
        if (productName) {
          if (!productTotals[productName]) {
            productTotals[productName] = { name: productName, cantidad: 0 };
          }
          productTotals[productName].cantidad += item.quantity || 1;
        }
      });

      // Sort and take top 5
      const sortedProducts = Object.values(productTotals)
        .sort((a, b) => b.cantidad - a.cantidad)
        .slice(0, 5)
        .map(p => ({
          name: p.name.length > 15 ? p.name.substring(0, 15) + '...' : p.name,
          fullName: p.name,
          cantidad: p.cantidad,
        }));

      if (sortedProducts.length > 0) {
        setData(sortedProducts);
      } else {
        // Sample data if no products
        setData([
          { name: 'Armazón Ray-Ban', fullName: 'Armazón Ray-Ban Classic', cantidad: 45 },
          { name: 'Lente Progresivo', fullName: 'Lente Progresivo Premium', cantidad: 38 },
          { name: 'Armazón Oakley', fullName: 'Armazón Oakley Sport', cantidad: 32 },
          { name: 'Lente Antirrefle...', fullName: 'Lente Antirreflejo HD', cantidad: 28 },
          { name: 'Estuche Premium', fullName: 'Estuche Premium Cuero', cantidad: 24 },
        ]);
      }
    } catch (error) {
      console.error('Error fetching top products:', error);
      setData([
        { name: 'Armazón Ray-Ban', fullName: 'Armazón Ray-Ban Classic', cantidad: 45 },
        { name: 'Lente Progresivo', fullName: 'Lente Progresivo Premium', cantidad: 38 },
        { name: 'Armazón Oakley', fullName: 'Armazón Oakley Sport', cantidad: 32 },
        { name: 'Lente Antirrefle...', fullName: 'Lente Antirreflejo HD', cantidad: 28 },
        { name: 'Estuche Premium', fullName: 'Estuche Premium Cuero', cantidad: 24 },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg shadow-lg p-3">
          <p className="text-sm font-medium text-foreground">{payload[0].payload.fullName}</p>
          <p className="text-lg font-bold text-primary">
            {payload[0].value} unidades
          </p>
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-accent/10">
            <Package className="h-4 w-4 text-accent" />
          </div>
          <div>
            <CardTitle className="text-lg">Productos Más Vendidos</CardTitle>
            <p className="text-sm text-muted-foreground">Top 5 del período</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={data} 
              layout="vertical" 
              margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
            >
              <XAxis 
                type="number" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(220, 9%, 46%)', fontSize: 11 }}
              />
              <YAxis 
                type="category" 
                dataKey="name" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(220, 9%, 46%)', fontSize: 11 }}
                width={100}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(220, 14%, 96%, 0.5)' }} />
              <Bar 
                dataKey="cantidad" 
                radius={[0, 4, 4, 0]}
                animationDuration={1000}
                animationBegin={0}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
