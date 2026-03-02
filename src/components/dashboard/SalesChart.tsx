import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { name: 'Lun', ventas: 12400 },
  { name: 'Mar', ventas: 15800 },
  { name: 'Mié', ventas: 9200 },
  { name: 'Jue', ventas: 18600 },
  { name: 'Vie', ventas: 22400 },
  { name: 'Sáb', ventas: 28900 },
  { name: 'Dom', ventas: 8200 },
];

export function SalesChart() {
  return (
    <div className="bg-card rounded-xl border border-border shadow-sm p-6">
      <div className="mb-6">
        <h3 className="font-display font-semibold text-lg">Ventas de la Semana</h3>
        <p className="text-sm text-muted-foreground">Ingresos totales por día</p>
      </div>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(222, 47%, 18%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(222, 47%, 18%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
            <XAxis 
              dataKey="name" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(220, 9%, 46%)', fontSize: 12 }}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(220, 9%, 46%)', fontSize: 12 }}
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(0, 0%, 100%)',
                border: '1px solid hsl(220, 13%, 91%)',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              }}
              formatter={(value: number) => [`$${value.toLocaleString('es-MX')}`, 'Ventas']}
            />
            <Area
              type="monotone"
              dataKey="ventas"
              stroke="hsl(222, 47%, 18%)"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorVentas)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
