export type PaperSize = '58mm' | '80mm';
export type PrintDensity = 'normal' | 'dark' | 'extra_dark';
export type PrintSpeed = 'normal' | 'slow';

export interface PrinterSettings {
  paperSize: PaperSize;
  density: PrintDensity;
  speed: PrintSpeed;
}

const STORAGE_KEY = 'printer_settings_local';

function readLocalSettings(): PrinterSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        paperSize: parsed.paperSize === '58mm' ? '58mm' : '80mm',
        density: ['dark', 'extra_dark'].includes(parsed.density) ? parsed.density : 'normal',
        speed: parsed.speed === 'slow' ? 'slow' : 'normal',
      };
    }
  } catch {}
  return { paperSize: '80mm', density: 'normal', speed: 'normal' };
}

function writeLocalSettings(ps: PrinterSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ps));
}

export function usePrinterSettings(): PrinterSettings {
  return readLocalSettings();
}

export { readLocalSettings, writeLocalSettings };

/**
 * Returns CSS overrides for the given printer settings.
 */
export function getPrinterCSS(ps: PrinterSettings): string {
  const is58 = ps.paperSize === '58mm';
  const isDark = ps.density === 'dark';
  const isExtraDark = ps.density === 'extra_dark';
  const highDensity = isDark || isExtraDark;

  let css = '';

  if (is58) {
    css += `
      @page { size: 58mm auto; margin: 0mm; }
      body {
        width: 48mm;
        max-width: 48mm;
        font-size: 8pt;
        line-height: 1.15;
        letter-spacing: 0;
        color: #000 !important;
        overflow-x: hidden;
        word-break: break-word;
        overflow-wrap: anywhere;
      }
      * { color: #000 !important; }
      .header img {
        max-width: 30mm !important;
        max-height: 12mm;
        filter: grayscale(1) contrast(1.8);
      }
      .header h1 { font-size: 9pt; font-weight: 800; text-transform: uppercase; }
      .section-title { font-weight: 800; text-transform: uppercase; font-size: 8pt; }
      .rx-table th { font-size: 7pt; font-weight: 800; }
      .rx-table td { font-size: 8pt; font-weight: 700; }
      .detail-item .label { color: #000 !important; }
      .detail-item .value { font-weight: 700; }
      .meta-row .label { color: #000 !important; }
      .footer .branch { color: #000 !important; }
      .sig-label { color: #000 !important; }
      .phone-bar { font-weight: 600; }
    `;
  }

  if (highDensity) {
    const fw = isExtraDark ? '800' : '700';
    css += `
      body { font-weight: 600; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      * { color: #000 !important; text-shadow: none !important; }
      .ticket-bold, .ticket-title, .ticket-subtitle, h1, h2, h3, strong, b { font-weight: ${fw} !important; }
      .ticket-sep, .ok-badge, .priority-badge { border-color: #000 !important; }
    `;
  }

  return css;
}

export function getPrinterBodyStyles(ps: PrinterSettings): string {
  const parts: string[] = [];
  if (ps.paperSize === '58mm') {
    parts.push('width:48mm', 'max-width:48mm', 'font-size:8pt', 'line-height:1.15');
  }
  return parts.join(';');
}

export function getPageSize(ps: PrinterSettings): string {
  return ps.paperSize === '58mm' ? '58mm auto' : '80mm auto';
}

export function getTicketWidth(ps: PrinterSettings): string {
  return ps.paperSize === '58mm' ? '48mm' : '72mm';
}

export function getLogoMaxWidth(ps: PrinterSettings): string {
  return ps.paperSize === '58mm' ? '130px' : '200px';
}
