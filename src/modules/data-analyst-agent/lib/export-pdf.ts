import html2canvas from "html2canvas-pro"
import { jsPDF } from "jspdf"

export async function exportElementAsPdf(element: HTMLElement, filename: string) {
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff",
  })
  const imgData = canvas.toDataURL("image/jpeg", 0.98)

  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" })
  const margin = 10
  const usableWidth = pdf.internal.pageSize.getWidth() - margin * 2
  const usableHeight = pdf.internal.pageSize.getHeight() - margin * 2
  const imgHeight = (canvas.height * usableWidth) / canvas.width

  let heightLeft = imgHeight
  let position = 0
  pdf.addImage(imgData, "JPEG", margin, margin + position, usableWidth, imgHeight)
  heightLeft -= usableHeight

  while (heightLeft > 0) {
    position -= usableHeight
    pdf.addPage()
    pdf.addImage(imgData, "JPEG", margin, margin + position, usableWidth, imgHeight)
    heightLeft -= usableHeight
  }

  pdf.save(filename)
}

export async function exportElementsAsPdf(elements: HTMLElement[], filename: string) {
  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" })
  const margin = 10
  const gap = 4
  const usableWidth = pdf.internal.pageSize.getWidth() - margin * 2
  const usableHeight = pdf.internal.pageSize.getHeight() - margin * 2

  let cursorY = margin
  let placedAny = false

  for (const element of elements) {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
    })
    const imgData = canvas.toDataURL("image/jpeg", 0.98)
    const imgHeight = (canvas.height * usableWidth) / canvas.width

    if (imgHeight > usableHeight) {
      if (placedAny) {
        pdf.addPage()
      }

      let heightLeft = imgHeight
      let position = 0
      pdf.addImage(imgData, "JPEG", margin, margin + position, usableWidth, imgHeight)
      heightLeft -= usableHeight

      while (heightLeft > 0) {
        position -= usableHeight
        pdf.addPage()
        pdf.addImage(imgData, "JPEG", margin, margin + position, usableWidth, imgHeight)
        heightLeft -= usableHeight
      }

      cursorY = margin
      placedAny = true
      continue
    }

    if (placedAny && cursorY + imgHeight > margin + usableHeight) {
      pdf.addPage()
      cursorY = margin
    }

    pdf.addImage(imgData, "JPEG", margin, cursorY, usableWidth, imgHeight)
    cursorY += imgHeight + gap
    placedAny = true
  }

  pdf.save(filename)
}
