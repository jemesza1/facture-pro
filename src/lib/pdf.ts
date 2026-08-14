/**
 * FacturePro PDF Engine — client-side only
 * Arabic: html2canvas captures Cairo-rendered preview (glyphs stay connected).
 * Optional: paste Cairo-Regular.ttf Base64 into CAIRO_BASE64 for native jsPDF text.
 */

export const CAIRO_BASE64 = ''

export function registerArabicFont(doc: any): boolean {
  if (!CAIRO_BASE64) return false
  doc.addFileToVFS('Cairo-Regular.ttf', CAIRO_BASE64)
  doc.addFont('Cairo-Regular.ttf', 'Cairo', 'normal')
  return true
}

export async function downloadInvoicePdf(element: HTMLElement, filename: string): Promise<void> {
  const html2canvas = (await import('html2canvas')).default
  const { jsPDF } = await import('jspdf')
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
  })
  const pdf = new jsPDF('p', 'mm', 'a4')
  const img = canvas.toDataURL('image/png')
  const pageW = pdf.internal.pageSize.getWidth()
  const pageH = pdf.internal.pageSize.getHeight()
  const imgH = (canvas.height * pageW) / canvas.width
  pdf.addImage(img, 'PNG', 0, 0, pageW, Math.min(imgH, pageH))
  pdf.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`)
}

export function printInvoice(element: HTMLElement) {
  const win = window.open('', '_blank')
  if (!win) return
  win.document.write(`<!DOCTYPE html><html><head><title>Print</title>
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>@page{size:A4;margin:12mm}body{margin:0;font-family:Inter,Cairo,sans-serif}*{ -webkit-print-color-adjust:exact;print-color-adjust:exact}</style>
    </head><body>${element.innerHTML}</body></html>`)
  win.document.close()
  setTimeout(() => { win.print(); win.close() }, 400)
}
