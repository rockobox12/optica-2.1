import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Users, UserPlus, Calendar, FileSpreadsheet, Search, Eye, TrendingUp } from 'lucide-react';
import { format, parseISO, differenceInYears, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';

const COLORS = ['#1a365d', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#f59e0b', '#ef4444'];

export function PatientAnalytics() {
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch patients
  const { data: patients = [], isLoading } = useQuery({
    queryKey: ['patients-analytics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Fetch sales per patient
  const { data: patientSales = [] } = useQuery({
    queryKey: ['patient-sales-analytics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales')
        .select('patient_id, total, created_at')
        .not('patient_id', 'is', null);

      if (error) throw error;
      return data;
    },
  });

  // Fetch prescriptions
  const { data: prescriptions = [] } = useQuery({
    queryKey: ['prescriptions-analytics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('patient_prescriptions')
        .select('patient_id, exam_date');

      if (error) throw error;
      return data;
    },
  });

  // Summary calculations
  const summary = {
    totalPatients: patients.length,
    newThisMonth: patients.filter(p => {
      const created = new Date(p.created_at);
      const monthStart = startOfMonth(new Date());
      return created >= monthStart;
    }).length,
    withPrescription: new Set(prescriptions.map(p => p.patient_id)).size,
    avgAge: patients.filter(p => p.birth_date).length > 0
      ? Math.round(patients
          .filter(p => p.birth_date)
          .reduce((sum, p) => sum + differenceInYears(new Date(), new Date(p.birth_date!)), 0) 
          / patients.filter(p => p.birth_date).length)
      : 0,
  };

  // Patients by gender
  const genderData = [
    { name: 'Masculino', value: patients.filter(p => p.gender === 'male').length },
    { name: 'Femenino', value: patients.filter(p => p.gender === 'female').length },
    { name: 'Otro/No especificado', value: patients.filter(p => !p.gender || p.gender === 'other').length },
  ].filter(d => d.value > 0);

  // Patients by age group
  const ageGroups = patients.reduce((acc: Record<string, number>, patient) => {
    if (!patient.birth_date) {
      acc['Sin datos'] = (acc['Sin datos'] || 0) + 1;
    } else {
      const age = differenceInYears(new Date(), new Date(patient.birth_date));
      if (age < 18) acc['0-17'] = (acc['0-17'] || 0) + 1;
      else if (age < 30) acc['18-29'] = (acc['18-29'] || 0) + 1;
      else if (age < 45) acc['30-44'] = (acc['30-44'] || 0) + 1;
      else if (age < 60) acc['45-59'] = (acc['45-59'] || 0) + 1;
      else acc['60+'] = (acc['60+'] || 0) + 1;
    }
    return acc;
  }, {});

  const ageChartData = Object.entries(ageGroups).map(([name, value]) => ({ name, value }));

  // New patients trend (last 6 months)
  const newPatientsTrend = [];
  for (let i = 5; i >= 0; i--) {
    const monthDate = subMonths(new Date(), i);
    const monthStart = startOfMonth(monthDate);
    const monthEnd = endOfMonth(monthDate);
    
    const count = patients.filter(p => {
      const created = new Date(p.created_at);
      return created >= monthStart && created <= monthEnd;
    }).length;

    newPatientsTrend.push({
      month: format(monthDate, 'MMM', { locale: es }),
      nuevos: count,
    });
  }

  // Top patients by sales
  const salesByPatient = patientSales.reduce((acc: Record<string, number>, sale) => {
    if (sale.patient_id) {
      acc[sale.patient_id] = (acc[sale.patient_id] || 0) + (sale.total || 0);
    }
    return acc;
  }, {});

  const topPatients = Object.entries(salesByPatient)
    .map(([patientId, totalSales]) => {
      const patient = patients.find(p => p.id === patientId);
      return {
        id: patientId,
        name: patient ? `${patient.first_name} ${patient.last_name}` : 'Desconocido',
        totalSales,
        visits: patientSales.filter(s => s.patient_id === patientId).length,
      };
    })
    .sort((a, b) => b.totalSales - a.totalSales)
    .slice(0, 10);

  // Filtered patients for table
  const filteredPatients = patients.filter(patient => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      patient.first_name?.toLowerCase().includes(search) ||
      patient.last_name?.toLowerCase().includes(search) ||
      patient.email?.toLowerCase().includes(search) ||
      patient.phone?.includes(search)
    );
  }).slice(0, 50);

  const exportToCSV = () => {
    const headers = ['Nombre', 'Email', 'Teléfono', 'Género', 'Fecha Nacimiento', 'Edad', 'Fecha Registro'];
    const rows = patients.map(p => [
      `${p.first_name} ${p.last_name}`,
      p.email || 'N/A',
      p.phone || 'N/A',
      p.gender === 'male' ? 'M' : p.gender === 'female' ? 'F' : 'N/A',
      p.birth_date || 'N/A',
      p.birth_date ? differenceInYears(new Date(), new Date(p.birth_date)) : 'N/A',
      format(parseISO(p.created_at), 'dd/MM/yyyy'),
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pacientes-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="h-6 w-6 mx-auto mb-2 text-blue-500" />
            <p className="text-sm text-muted-foreground">Total Pacientes</p>
            <p className="text-2xl font-bold">{summary.totalPatients.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <UserPlus className="h-6 w-6 mx-auto mb-2 text-green-500" />
            <p className="text-sm text-muted-foreground">Nuevos Este Mes</p>
            <p className="text-2xl font-bold text-green-600">{summary.newThisMonth}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Eye className="h-6 w-6 mx-auto mb-2 text-purple-500" />
            <p className="text-sm text-muted-foreground">Con Graduación</p>
            <p className="text-2xl font-bold">{summary.withPrescription}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Calendar className="h-6 w-6 mx-auto mb-2 text-orange-500" />
            <p className="text-sm text-muted-foreground">Edad Promedio</p>
            <p className="text-2xl font-bold">{summary.avgAge} años</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Por Género</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={genderData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                  >
                    {genderData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Por Grupo de Edad</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ageChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#2563eb" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Nuevos Pacientes (6 meses)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={newPatientsTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="nuevos" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Patients */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-500" />
            Top 10 Clientes por Compras
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead className="text-center">Visitas</TableHead>
                <TableHead className="text-right">Total Compras</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topPatients.map((patient, index) => (
                <TableRow key={patient.id}>
                  <TableCell>
                    <Badge variant={index < 3 ? 'default' : 'secondary'}>
                      {index + 1}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{patient.name}</TableCell>
                  <TableCell className="text-center">{patient.visits}</TableCell>
                  <TableCell className="text-right font-bold text-green-600">
                    ${patient.totalSales.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Patients List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Lista de Pacientes</CardTitle>
            <div className="flex gap-2">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar paciente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline" onClick={exportToCSV}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Exportar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Edad</TableHead>
                  <TableHead>Registro</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPatients.map((patient) => (
                  <TableRow key={patient.id}>
                    <TableCell className="font-medium">
                      {patient.first_name} {patient.last_name}
                    </TableCell>
                    <TableCell>{patient.email || '—'}</TableCell>
                    <TableCell>{patient.phone || '—'}</TableCell>
                    <TableCell>
                      {patient.birth_date 
                        ? `${differenceInYears(new Date(), new Date(patient.birth_date))} años`
                        : '—'}
                    </TableCell>
                    <TableCell>{format(parseISO(patient.created_at), 'dd/MM/yyyy')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
