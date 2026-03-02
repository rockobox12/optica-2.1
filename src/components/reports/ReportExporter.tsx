import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, FileSpreadsheet, FileText, Printer, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface ExportColumn {
  key: string;
  header: string;
  formatter?: (value: any) => string;
}

interface ReportExporterProps {
  data: any[];
  columns: ExportColumn[];
  filename: string;
  title?: string;
  subtitle?: string;
}

export function ReportExporter({
  data,
  columns,
  filename,
  title = 'Reporte',
  subtitle,
}: ReportExporterProps) {
  const [exporting, setExporting] = useState<string | null>(null);

  const exportCSV = async () => {
    setExporting('csv');
    try {
      const headers = columns.map(c => c.header);
      const rows = data.map(row =>
        columns.map(col => {
          const value = row[col.key];
          if (col.formatter) return col.formatter(value);
          if (value === null || value === undefined) return '';
          if (typeof value === 'string' && value.includes(',')) return `"${value}"`;
          return String(value);
        })
      );

      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const BOM = '\uFEFF';
      const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
      downloadBlob(blob, `${filename}.csv`);
      toast.success('CSV exportado correctamente');
    } catch (error) {
      toast.error('Error al exportar CSV');
    } finally {
      setExporting(null);
    }
  };

  const exportExcel = async () => {
    setExporting('excel');
    try {
      // Create Excel-compatible XML format
      const headers = columns.map(c => `<th style="background-color:#1a365d;color:white;font-weight:bold;padding:8px;">${c.header}</th>`).join('');
      const rows = data.map((row, i) => {
        const cells = columns.map(col => {
          const value = row[col.key];
          const formatted = col.formatter ? col.formatter(value) : (value ?? '');
          return `<td style="border:1px solid #ddd;padding:6px;">${formatted}</td>`;
        }).join('');
        return `<tr style="background-color:${i % 2 === 0 ? '#ffffff' : '#f9fafb'}">${cells}</tr>`;
      }).join('');

      const html = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
        <head>
          <meta charset="UTF-8">
          <style>
            table { border-collapse: collapse; font-family: Arial, sans-serif; font-size: 11px; }
            th, td { text-align: left; }
          </style>
        </head>
        <body>
          <h2 style="font-family:Arial;color:#1a365d;">${title}</h2>
          ${subtitle ? `<p style="font-family:Arial;color:#666;">${subtitle}</p>` : ''}
          <p style="font-family:Arial;color:#999;font-size:10px;">Generado: ${format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
          <table border="1">
            <thead><tr>${headers}</tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </body>
        </html>
      `;

      const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
      downloadBlob(blob, `${filename}.xls`);
      toast.success('Excel exportado correctamente');
    } catch (error) {
      toast.error('Error al exportar Excel');
    } finally {
      setExporting(null);
    }
  };

  const exportPDF = async () => {
    setExporting('pdf');
    try {
      // Create printable HTML
      const headers = columns.map(c => `<th style="background-color:#1a365d;color:white;padding:10px 8px;text-align:left;font-size:11px;">${c.header}</th>`).join('');
      const rows = data.map((row, i) => {
        const cells = columns.map(col => {
          const value = row[col.key];
          const formatted = col.formatter ? col.formatter(value) : (value ?? '');
          return `<td style="border-bottom:1px solid #e5e7eb;padding:8px;font-size:11px;">${formatted}</td>`;
        }).join('');
        return `<tr style="background-color:${i % 2 === 0 ? '#ffffff' : '#f9fafb'}">${cells}</tr>`;
      }).join('');

      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast.error('Permite ventanas emergentes para exportar PDF');
        return;
      }

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${title}</title>
          <style>
            @page { margin: 15mm; size: A4 landscape; }
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; border-bottom: 2px solid #1a365d; padding-bottom: 15px; }
            .header-left h1 { color: #1a365d; margin: 0 0 5px 0; font-size: 22px; }
            .header-left p { color: #666; margin: 0; font-size: 12px; }
            .header-right { text-align: right; color: #999; font-size: 10px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            thead { background-color: #1a365d; }
            th { color: white; }
            .footer { margin-top: 30px; text-align: center; color: #999; font-size: 10px; border-top: 1px solid #e5e7eb; padding-top: 10px; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="header-left">
              <h1>${title}</h1>
              ${subtitle ? `<p>${subtitle}</p>` : ''}
            </div>
            <div class="header-right">
              <p>Generado: ${format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
              <p>Total registros: ${data.length}</p>
            </div>
          </div>
          <table>
            <thead><tr>${headers}</tr></thead>
            <tbody>${rows}</tbody>
          </table>
          <div class="footer">
            <p>Óptica Istmeña - Reporte generado automáticamente</p>
          </div>
          <script>window.onload = function() { window.print(); }</script>
        </body>
        </html>
      `);
      printWindow.document.close();
      toast.success('PDF generado - usa Ctrl+P para guardar');
    } catch (error) {
      toast.error('Error al exportar PDF');
    } finally {
      setExporting(null);
    }
  };

  const handlePrint = () => {
    exportPDF();
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const isExporting = exporting !== null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={isExporting || data.length === 0}>
          {isExporting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          Exportar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={exportCSV} disabled={isExporting}>
          <FileSpreadsheet className="h-4 w-4 mr-2 text-green-600" />
          Exportar CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportExcel} disabled={isExporting}>
          <FileSpreadsheet className="h-4 w-4 mr-2 text-emerald-600" />
          Exportar Excel
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={exportPDF} disabled={isExporting}>
          <FileText className="h-4 w-4 mr-2 text-red-600" />
          Exportar PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handlePrint} disabled={isExporting}>
          <Printer className="h-4 w-4 mr-2 text-blue-600" />
          Imprimir
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
