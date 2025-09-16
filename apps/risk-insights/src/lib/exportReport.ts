import { toPng } from 'html-to-image'
import jsPDF from 'jspdf'

async function nodeToPng(node: HTMLElement | SVGSVGElement | null) {
  if (!node) return null

  // Prefer the inner SVG if this node contains a Recharts chart
  const innerSvg = node instanceof HTMLElement
    ? (node.querySelector('svg') as SVGSVGElement | null)
    : null;

  const target: HTMLElement | SVGSVGElement = innerSvg ?? node;

  // Let layout settle for a frame
  await new Promise<void>(r => requestAnimationFrame(() => r()));

  try {
    return await toPng(target as HTMLElement, {
      cacheBust: true,
      pixelRatio: 2,
      backgroundColor: 'white',
    })
  } catch (e) {
    console.warn('toPng failed for node:', target, e)
    return null
  }
}

type ChartRef = { title: string; node: HTMLElement | SVGSVGElement | null }

const titleCase = (s: string) =>
  s.replace(/\w\S*/g, t => t[0].toUpperCase() + t.slice(1).toLowerCase());

export async function exportDashboardPdf(opts: {
  title: string
  /** e.g. "Product: Home • Severity: Low • Date: Apr 8, 2023 - May 8, 2024 • County: Hartford" */
  filtersSummary: string
  charts: ChartRef[]
}) {
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: 'a4' })
  const pageW = pdf.internal.pageSize.getWidth()
  const pageH = pdf.internal.pageSize.getHeight()
  const M = 24
  let y = M

  // Helpers
  const line = (yy: number) => pdf.line(M, yy, pageW - M, yy)
  const text = (t: string, x: number, yy: number) => pdf.text(t, x, yy)

  // Title
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(18)
  text(opts.title, M, y)
  y += 22

  // Summary card
  const cardY = y
  const cardH = 48
  pdf.setDrawColor(220); pdf.setFillColor(248, 249, 251)
  pdf.roundedRect(M, cardY, pageW - M * 2, cardH, 6, 6, 'F')

  const drawKV = (label: string, value: string, x: number) => {
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(12)
    text(label, x, cardY + 18)
    pdf.setFont('helvetica', 'normal')
    pdf.text(value, x, cardY + 36, { maxWidth: (pageW - M * 2) / 3 - 12 })
  }

  const parts = opts.filtersSummary.split('•').map(s => s.trim())
  const summaryColW = (pageW - M * 2) / 3
  parts.slice(0, 3).forEach((p, i) => {
    const [label, ...rest] = p.split(':')
    drawKV(`${(label || '').trim()}:`, (rest.join(':') || '').trim(), M + i * summaryColW + 12)
  })

  y = cardY + cardH + 16

  // Build a key/value map out of the summary parts
  const kv = Object.fromEntries(
  parts.map(p => {
    const [k, ...rest] = p.split(':');
    return [(k || '').trim().toLowerCase(), (rest.join(':') || '').trim()];
  })
);

  // Prefer "Counties", fall back to single "County"
  const countiesStr = kv['counties'] || kv['county'] || '';

  y = cardY + cardH + 12;

  if (countiesStr) {
    y += 12;

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    text('Counties:', M, y);

    pdf.setFont('helvetica', 'normal');
    const pills = countiesStr.split(',')
    .map(s => titleCase(s.trim()))
    .filter(Boolean);

    const startX = M + 80;
    let x = startX;
    let yy = y;

    const padX = 8, padY = 4;
    const r = 6, gap = 6;
    const h = 22;

    for (const name of pills) {
      const w = pdf.getTextWidth(name) + padX * 2;

      // wrap pills if they'd overflow the page
      if (x + w > pageW - M) {
        yy += h + gap;
        x = startX;
      }

      // draw pill
      pdf.setDrawColor(220);
      pdf.setFillColor(242, 245, 248);
      pdf.roundedRect(x, yy - (h - padY), w, h, r, r, 'F');
      pdf.text(name, x + padX, yy);

      x += w + gap;
    }

    y = yy + 16;
  }

  pdf.setDrawColor(230); line(y);
  y += 12;

  // Charts laid out in one row (await each image)
  // type guard: narrows node to not-null + the right element types
const liveCharts = opts.charts.filter(
  (c): c is { title: string; node: HTMLElement | SVGSVGElement } => !!c.node
);

const n = liveCharts.length;
  if (n > 0) {
  const colW = (pageW - M * (n + 1)) / n;
  const colH = Math.round((colW * 9) / 16);
  const captionH = 14;

  for (const [i, c] of liveCharts.entries()) {
    // settle layout for a frame (typed)
    await new Promise<void>(r => requestAnimationFrame(() => r()));

    // prefer inner <svg> when present
    const svg = (c.node as HTMLElement | null)
      ?.querySelector?.('svg') as SVGSVGElement | null;

    const target: HTMLElement | SVGSVGElement =
      svg ?? (c.node as HTMLElement | SVGSVGElement);

    const dataUrl = await toPng(target as unknown as HTMLElement, {
      cacheBust: true,
      pixelRatio: 2,
      backgroundColor: 'white',
    });

    if (!dataUrl) continue;

    const x = M + i * (colW + M);
    const yy = y;

    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(11);
    pdf.text(c.title, x, yy);

    pdf.addImage(dataUrl, 'PNG', x, yy + captionH, colW, colH, undefined, 'FAST');
  }

  y += colH + captionH + 16;
}

  // Footer + save
  footer(pdf)
  pdf.save('hartford-risk-insights.pdf')
}

function footer(pdf: jsPDF) {
  const pageW = pdf.internal.pageSize.getWidth()
  const pageH = pdf.internal.pageSize.getHeight()
  const time = new Date().toLocaleString()
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9)
  pdf.setTextColor(120)
  pdf.text(`Generated: ${time}`, 24, pageH - 14)
  pdf.text(`Page ${pdf.getNumberOfPages()}`, pageW - 24, pageH - 14, { align: 'right' })
  pdf.setTextColor(0)
}