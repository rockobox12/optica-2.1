import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Printer, AlertTriangle } from 'lucide-react';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { usePrinterSettings, getPrinterCSS } from '@/hooks/usePrinterSettings';
import { THERMAL_PRINT_STYLES, THERMAL_PAGE_STYLE_LETTER } from '@/lib/thermal-print-styles';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export function PrintTestTool() {
  const { settings, isLoading } = useCompanySettings();
  const printerSettings = usePrinterSettings();
  const [printMode, setPrintMode] = useState<'thermal' | 'letter'>('thermal');

  const now = new Date();
  const dateStr = format(now, "dd/MM/yyyy HH:mm:ss", { locale: es });

  const handleTestPrint = () => {
    const pageOverride = printMode === 'letter' ? THERMAL_PAGE_STYLE_LETTER : '';
    const bodyClass = printMode === 'letter' ? ' class="print-letter"' : '';
    const printerCSS = printMode === 'thermal' ? getPrinterCSS(printerSettings) : '';

    const logoHtml = settings?.logo_url
      ? `<img src="${settings.logo_url}" alt="Logo" />`
      : `<p style="font-size:9px;color:#999;">[Sin logo configurado]</p>`;

    const companyName = settings?.company_name || 'ÓPTICA ISTMEÑA';
    const slogan = settings?.slogan || '';
    const paperLabel = printerSettings.paperSize === '58mm' ? '58mm' : (printMode === 'letter' ? 'CARTA' : '80mm');

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Prueba de Impresión</title>
          <style>
            ${THERMAL_PRINT_STYLES}
            ${pageOverride}
            ${printerCSS}
            .calibration { margin: 8px 0; }
            .calibration .ruler {
              border-top: 2px solid #000;
              border-bottom: 2px solid #000;
              text-align: center;
              padding: 2px 0;
              font-size: 8px;
              letter-spacing: 0;
              font-family: 'Courier New', monospace;
              font-weight: 700;
            }
            .margin-test {
              display: flex;
              justify-content: space-between;
              font-size: 8px;
              font-family: 'Courier New', monospace;
              margin: 4px 0;
              font-weight: 700;
            }
            .font-test { margin: 6px 0; }
            .font-test .small { font-size: 8px; font-weight: 600; }
            .font-test .normal { font-size: 11px; font-weight: 600; }
            .font-test .large { font-size: 14px; font-weight: 800; }
            .ok-badge {
              text-align: center;
              font-size: 12px;
              font-weight: 800;
              border: 2px solid #000;
              padding: 4px;
              margin: 6px 0;
              letter-spacing: 2px;
            }
            .density-test {
              margin: 6px 0;
              text-align: center;
            }
            .density-bar {
              height: 4px;
              background: #000;
              margin: 3px auto;
              width: 90%;
            }
            .total-test {
              text-align: center;
              font-size: 18px;
              font-weight: 800;
              margin: 8px 0;
              letter-spacing: 1px;
            }
          </style>
        </head>
        <body${bodyClass}>
          <div class="header">
            ${logoHtml}
            <h1>${companyName}</h1>
            ${slogan ? `<p class="slogan">${slogan}</p>` : ''}
          </div>

          <div style="text-align:center;margin-bottom:6px;">
            <span style="font-size:8px;font-weight:700;">PRUEBA DE IMPRESIÓN</span><br/>
            <span style="font-size:9px;font-weight:600;">${dateStr}</span>
          </div>

          <div class="ok-badge">
            ✓ ANCHO ${paperLabel} OK
          </div>

          <div class="density-test">
            <p style="font-size:8px;font-weight:700;">PRUEBA DE DENSIDAD:</p>
            <div class="density-bar"></div>
            <div class="density-bar" style="height:2px;"></div>
            <div class="density-bar" style="height:1px;"></div>
            <p style="font-size:7px;margin-top:2px;">Si las líneas se ven grises → aumentar densidad</p>
          </div>

          <div class="total-test">$1,234.56</div>

          <div class="calibration">
            <div class="ruler">
              ----------------------------------------
            </div>
            <p style="font-size:8px;text-align:center;margin:3px 0;font-weight:600;">
              Si esta línea se corta, ajustar márgenes
            </p>
          </div>

          <div class="calibration">
            <p style="font-size:9px;font-weight:800;margin-bottom:2px;">Prueba de caracteres:</p>
            <p style="font-size:10px;font-family:'Courier New',monospace;word-break:break-all;font-weight:600;">
              0123456789 ABCDEFGHIJ<br/>
              KLMNOPQRSTUVWXYZ<br/>
              abcdefghijklmnopqrst<br/>
              uvwxyz !@#$%&amp;*()
            </p>
          </div>

          <div class="margin-test">
            <span>|&lt;-- izq</span>
            <span>der --&gt;|</span>
          </div>

          <div class="font-test">
            <p style="font-size:9px;font-weight:800;margin-bottom:3px;">Tamaños de fuente:</p>
            <p class="small">Texto PEQUEÑO (8px) — detalle fino</p>
            <p class="normal">Texto NORMAL (11px) — uso general</p>
            <p class="large">Texto GRANDE (14px)</p>
          </div>

          <div class="phone-bar">
            <span>Teléfono configurado</span>
            <strong>${settings?.phone || 'No configurado'}</strong>
          </div>

          <div class="signatures">
            <div class="sig-block">
              <div class="sig-line"></div>
              <span class="sig-label">Firma prueba</span>
            </div>
            <div class="sig-block">
              <div class="sig-line"></div>
              <span class="sig-label">Firma prueba</span>
            </div>
          </div>

          <div class="footer">
            <p class="company">${companyName}</p>
            <p class="thanks">¡Gracias por su preferencia!</p>
            ${slogan ? `<p style="font-size:7px;margin-top:2px;">${slogan}</p>` : ''}
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Printer className="h-5 w-5 text-primary" />
          Prueba de Calibración
        </CardTitle>
        <CardDescription>
          Imprime un mini-ticket para validar márgenes, densidad y logo.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Print mode selector */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground">Modo impresión:</span>
          <div className="flex items-center border rounded-lg p-0.5 bg-muted/50">
            <button
              type="button"
              onClick={() => setPrintMode('thermal')}
              className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
                printMode === 'thermal'
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              🖨️ Térmica {printerSettings.paperSize}
            </button>
            <button
              type="button"
              onClick={() => setPrintMode('letter')}
              className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
                printMode === 'letter'
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              📄 Carta / A4
            </button>
          </div>
        </div>

        {/* Logo warning */}
        {!isLoading && !settings?.logo_url && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              No hay logo cargado. Configúralo en <strong>Settings → Empresa</strong> para que aparezca en los tickets.
            </AlertDescription>
          </Alert>
        )}

        {/* Test print button */}
        <Button onClick={handleTestPrint} size="lg" className="gap-2 w-full sm:w-auto">
          <Printer className="h-5 w-5" />
          Prueba de impresión
        </Button>

        {/* Help text */}
        <div className="text-xs text-muted-foreground space-y-1 border-t pt-3">
          <p><strong>¿Qué verifica este ticket?</strong></p>
          <ul className="list-disc list-inside space-y-0.5 ml-1">
            <li>Que el logo no se corte ni desborde</li>
            <li>Que los márgenes izquierdo y derecho sean visibles</li>
            <li>Que la línea de calibración no se trunque</li>
            <li>Que las barras de densidad se vean negras y sólidas</li>
            <li>Que el total en peso grande sea legible</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
