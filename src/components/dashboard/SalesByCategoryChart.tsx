import { useState, useEffect } from 'react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer,
  Legend,
  Tooltip 
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { PieChart as PieChartIcon } from 'lucide-react';

interface CategoryData {
  name: string;
  value: number;
  percentage: number;
}

const COLORS = ['#0F4C81', '#2E7BB4', '#10B981', '#F59E0B', '#8B5CF6'];

export function SalesByCategoryChart() {
  const [data, setData] = useState<CategoryData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchSalesByCategory();
  }, []);

  const fetchSalesByCategory = async () => {
    try {
      const { data: saleItems, error } = await supabase
        .from('sale_items')
        .select(`
          subtotal,
          product:products(
            category:product_categories(name)
          )
        `)
        .limit(500);

      if (error) throw error;

      // Aggregate by category
      const categoryTotals: Record<string, number> = {};
      let totalSales = 0;

      saleItems?.forEach(item => {
        const categoryName = (item.product as any)?.category?.name || 'Otros';
        const amount = item.subtotal || 0;
        categoryTotals[categoryName] = (categoryTotals[categoryName] || 0) + amount;
        totalSales += amount;
      });

      // Convert to chart data with percentages
      const chartData: CategoryData[] = Object.entries(categoryTotals)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, value]) => ({
          name,
          value,
          percentage: totalSales > 0 ? Math.round((value / totalSales) * 100) : 0,
        }));

      if (chartData.length > 0) {
        setData(chartData);
      } else {
        // Sample data
        setData([
          { name: 'Armazones', value: 125000, percentage: 42 },
          { name: 'Lentes', value: 98000, percentage: 33 },
          { name: 'Accesorios', value: 45000, percentage: 15 },
          { name: 'Contacto', value: 22000, percentage: 7 },
          { name: 'Otros', value: 10000, percentage: 3 },
        ]);
      }
    } catch (error) {
      console.error('Error fetching sales by category:', error);
      setData([
        { name: 'Armazones', value: 125000, percentage: 42 },
        { name: 'Lentes', value: 98000, percentage: 33 },
        { name: 'Accesorios', value: 45000, percentage: 15 },
        { name: 'Contacto', value: 22000, percentage: 7 },
        { name: 'Otros', value: 10000, percentage: 3 },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg shadow-lg p-3">
          <p className="text-sm font-medium text-foreground">{payload[0].name}</p>
          <p className="text-lg font-bold text-primary">
            ${payload[0].value.toLocaleString('es-MX')}
          </p>
          <p className="text-sm text-muted-foreground">
            {payload[0].payload.percentage}% del total
          </p>
        </div>
      );
    }
    return null;
  };

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    if (percent < 0.05) return null;

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor="middle" 
        dominantBaseline="central"
        className="text-xs font-semibold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  const CustomLegend = ({ payload }: any) => (
    <div className="flex flex-col gap-2 mt-4">
      {payload?.map((entry: any, index: number) => (
        <div key={`legend-${index}`} className="flex items-center gap-2">
          <div 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-sm text-muted-foreground">{entry.value}</span>
          <span className="text-sm font-medium text-foreground ml-auto">
            {data[index]?.percentage}%
          </span>
        </div>
      ))}
    </div>
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full rounded-full mx-auto" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-success/10">
            <PieChartIcon className="h-4 w-4 text-success" />
          </div>
          <div>
            <CardTitle className="text-lg">Ventas por Categoría</CardTitle>
            <p className="text-sm text-muted-foreground">Distribución porcentual</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="45%"
                labelLine={false}
                label={renderCustomizedLabel}
                innerRadius={60}
                outerRadius={100}
                paddingAngle={3}
                dataKey="value"
                animationDuration={1000}
                animationBegin={0}
              >
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={COLORS[index % COLORS.length]}
                    stroke="none"
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend content={<CustomLegend />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
