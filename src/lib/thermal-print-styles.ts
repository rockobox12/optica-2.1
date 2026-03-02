/**
 * Shared thermal print CSS styles for 80mm ticket printers.
 * Also supports Carta/A4 mode via a CSS class toggle.
 */

export const THERMAL_PRINT_STYLES = `
  /* === Print Mode: Thermal 80mm (default) === */
  @page {
    size: 80mm auto;
    margin: 2mm;
  }

  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  body {
    font-family: 'Courier New', 'Lucida Console', monospace;
    font-size: 11px;
    color: #000;
    width: 76mm;
    max-width: 76mm;
    margin: 0 auto;
    padding: 0;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* === Logo: never crop === */
  .header {
    text-align: center;
    margin-bottom: 6px;
    page-break-inside: avoid;
  }

  .header img {
    max-width: 60mm;
    max-height: 20mm;
    height: auto;
    width: auto;
    display: block;
    margin: 0 auto 4px;
    object-fit: contain;
  }

  .header h1 {
    font-size: 13px;
    letter-spacing: 1.5px;
    margin: 2px 0;
    font-weight: 700;
    font-family: 'Courier New', monospace;
  }

  .header .slogan {
    font-size: 8px;
    color: #555;
    margin-bottom: 2px;
  }

  /* === Meta row === */
  .meta-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-bottom: 1px dashed #000;
    padding-bottom: 4px;
    margin-bottom: 6px;
  }

  .meta-row .label {
    font-size: 8px;
    color: #555;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .meta-row .value {
    font-size: 11px;
    font-weight: 700;
  }

  /* === Section titles === */
  .section-title {
    font-size: 9px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #333;
    margin: 8px 0 3px;
    border-bottom: 1px dashed #999;
    padding-bottom: 2px;
  }

  /* === RX Table === */
  .rx-table {
    width: 100%;
    border-collapse: collapse;
    margin: 4px 0 8px;
    page-break-inside: avoid;
  }

  .rx-table th {
    background: #eee;
    color: #000;
    font-size: 9px;
    font-weight: 700;
    padding: 3px 2px;
    text-align: center;
    border: 1px solid #999;
  }

  .rx-table td {
    padding: 3px 2px;
    text-align: center;
    font-family: 'Courier New', monospace;
    font-size: 11px;
    font-weight: 600;
    border: 1px solid #999;
  }

  .rx-table .eye-label,
  .rx-table .od-label,
  .rx-table .oi-label {
    font-weight: 700;
    text-align: left;
    padding-left: 4px;
    font-family: 'Courier New', monospace;
  }

  .rx-table .od-label { color: #000; }
  .rx-table .oi-label { color: #000; }

  /* === Details grid === */
  .details-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 3px 8px;
    margin: 4px 0 8px;
    page-break-inside: avoid;
  }

  .detail-item {
    border-bottom: 1px dotted #999;
    padding-bottom: 2px;
    min-height: 20px;
  }

  .detail-item .label {
    font-size: 8px;
    color: #555;
    text-transform: uppercase;
  }

  .detail-item .value {
    font-size: 10px;
    font-weight: 600;
    min-height: 12px;
  }

  /* === Notes === */
  .notes-box {
    border: 1px dashed #999;
    padding: 4px 6px;
    min-height: 24px;
    margin: 3px 0 8px;
    font-size: 10px;
    page-break-inside: avoid;
  }

  /* === Phone bar === */
  .phone-bar {
    border: 1px dashed #000;
    padding: 4px 6px;
    text-align: center;
    margin: 6px 0;
    font-size: 9px;
  }

  .phone-bar strong {
    font-size: 11px;
    display: block;
    margin-top: 1px;
  }

  /* === Signatures === */
  .signatures {
    display: flex;
    justify-content: space-around;
    margin-top: 20px;
    page-break-inside: avoid;
  }

  .sig-block {
    text-align: center;
    width: 42%;
  }

  .sig-line {
    border-top: 1px solid #000;
    margin-bottom: 2px;
  }

  .sig-label {
    font-size: 8px;
    color: #555;
  }

  /* === Footer === */
  .footer {
    text-align: center;
    margin-top: 8px;
    padding-top: 4px;
    border-top: 1px dashed #000;
    page-break-inside: avoid;
  }

  .footer .company {
    font-weight: 700;
    font-size: 9px;
  }

  .footer .branch {
    font-size: 8px;
    color: #555;
  }

  .footer .thanks {
    font-size: 8px;
    margin-top: 3px;
  }

  /* === Priority badge === */
  .priority-badge {
    display: inline-block;
    font-size: 8px;
    font-weight: 700;
    padding: 1px 4px;
    border: 1px solid #000;
    text-transform: uppercase;
  }

  /* === Delivery date === */
  .delivery-date {
    text-align: center;
    margin: 6px 0;
    page-break-inside: avoid;
  }

  .delivery-date .label {
    font-size: 8px;
    color: #555;
    text-transform: uppercase;
  }

  .delivery-date .value {
    font-size: 11px;
    font-weight: 700;
  }

  /* ==================================
     Carta/A4 mode override
     Add class "print-letter" to body
  ================================== */
  body.print-letter {
    width: auto;
    max-width: 180mm;
    font-family: 'Segoe UI', Arial, sans-serif;
    font-size: 12px;
  }

  @media print {
    body.print-letter {
      /* Override @page for letter */
    }
  }
`;

export const THERMAL_PAGE_STYLE_LETTER = `
  @page { size: letter; margin: 15mm; }
`;

/**
 * Landscape letter/A4 styles specifically for Lab Order printing.
 * Professional, high-legibility format with larger fonts.
 */
export const LAB_ORDER_LANDSCAPE_STYLES = `
  @page {
    size: letter landscape;
    margin: 12mm 15mm;
  }

  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  body {
    font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
    font-size: 12px;
    color: #000;
    width: 100%;
    max-width: 100%;
    margin: 0;
    padding: 0;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* === Header === */
  .lab-header {
    text-align: center;
    margin-bottom: 10px;
    page-break-inside: avoid;
  }

  .lab-header img {
    max-width: 180px;
    max-height: 50px;
    height: auto;
    width: auto;
    display: block;
    margin: 0 auto 6px;
    object-fit: contain;
    filter: grayscale(1) contrast(1.5);
  }

  .lab-header .company-name {
    font-size: 18px;
    font-weight: 800;
    letter-spacing: 2px;
    text-transform: uppercase;
    margin: 2px 0;
  }

  .lab-header .slogan {
    font-size: 11px;
    color: #333;
    margin-bottom: 4px;
  }

  .lab-header .order-title {
    font-size: 16px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    border-top: 2px solid #000;
    border-bottom: 2px solid #000;
    padding: 4px 0;
    margin-top: 8px;
  }

  /* === Meta info === */
  .lab-meta {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin: 10px 0;
    font-size: 12px;
  }

  .lab-meta .meta-item {
    line-height: 1.5;
  }

  .lab-meta .meta-label {
    font-size: 10px;
    color: #333;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .lab-meta .meta-value {
    font-size: 13px;
    font-weight: 700;
  }

  /* === Patient name === */
  .lab-patient {
    margin: 8px 0;
    padding: 6px 10px;
    border: 1px solid #000;
    page-break-inside: avoid;
  }

  .lab-patient .patient-label {
    font-size: 10px;
    color: #333;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .lab-patient .patient-name {
    font-size: 16px;
    font-weight: 700;
  }

  /* === RX Table === */
  .lab-rx-table {
    width: 100%;
    border-collapse: collapse;
    margin: 10px 0;
    page-break-inside: avoid;
  }

  .lab-rx-table th {
    background: #e8e8e8;
    color: #000;
    font-size: 11px;
    font-weight: 700;
    padding: 6px 8px;
    text-align: center;
    border: 1.5px solid #000;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .lab-rx-table td {
    padding: 6px 8px;
    text-align: center;
    font-family: 'Courier New', monospace;
    font-size: 13px;
    font-weight: 600;
    border: 1.5px solid #000;
  }

  .lab-rx-table .od-row {
    background: #e8f0fe;
  }

  .lab-rx-table .oi-row {
    background: #e8f5e9;
  }

  .lab-rx-table .eye-label {
    font-weight: 800;
    text-align: left;
    padding-left: 10px;
    font-size: 13px;
    font-family: 'Segoe UI', Arial, sans-serif;
  }

  .lab-rx-table .od-label {
    color: #1a56db;
  }

  .lab-rx-table .oi-label {
    color: #16a34a;
  }

  /* === Details grid === */
  .lab-details {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4px 30px;
    margin: 10px 0;
    page-break-inside: avoid;
  }

  .lab-detail-item {
    border-bottom: 1px solid #ccc;
    padding: 4px 0;
    min-height: 28px;
  }

  .lab-detail-item .detail-label {
    font-size: 10px;
    color: #333;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .lab-detail-item .detail-value {
    font-size: 12px;
    font-weight: 600;
    min-height: 16px;
  }

  /* === Notes === */
  .lab-notes {
    margin: 10px 0;
    page-break-inside: avoid;
  }

  .lab-notes .notes-label {
    font-size: 10px;
    color: #333;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 4px;
    font-weight: 700;
  }

  .lab-notes .notes-box {
    border: 1.5px solid #000;
    padding: 8px 10px;
    min-height: 50px;
    font-size: 11px;
    line-height: 1.4;
  }

  /* === Signatures === */
  .lab-signatures {
    display: flex;
    justify-content: space-around;
    margin-top: 40px;
    page-break-inside: avoid;
  }

  .lab-sig-block {
    text-align: center;
    width: 35%;
  }

  .lab-sig-line {
    border-top: 1.5px solid #000;
    margin-bottom: 4px;
  }

  .lab-sig-label {
    font-size: 10px;
    color: #333;
    text-transform: uppercase;
  }

  /* === Footer === */
  .lab-footer {
    text-align: center;
    margin-top: 12px;
    padding-top: 6px;
    border-top: 1.5px solid #000;
    page-break-inside: avoid;
  }

  .lab-footer .company {
    font-weight: 700;
    font-size: 11px;
  }

  .lab-footer .branch {
    font-size: 10px;
    color: #333;
  }
`;
