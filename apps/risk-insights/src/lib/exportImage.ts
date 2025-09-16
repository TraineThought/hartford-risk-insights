import { toPng } from 'html-to-image'

export async function exportNodeToPng(
  node: HTMLElement | null,
  filename: string
) {
  if (!node) return
  try {
    const dataUrl = await toPng(node, {
      cacheBust: true,
      pixelRatio: 2,              // sharper export
      backgroundColor: 'white'    // prevents dark-mode transparent PNGs
    })
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = filename
    a.click()
  } catch (err) {
    console.error('Export PNG failed:', err)
    alert('Sorry, could not export this chart.')
  }
}