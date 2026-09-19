import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export function exportToCSV(filename: string, rows: Record<string, any>[]) {
  if (!rows || rows.length === 0) {
    alert('No data to export for the selected filters.');
    return;
  }

  const headers = Object.keys(rows[0]);
  const csvContent = [
    headers.join(','),
    ...rows.map(row =>
      headers
        .map(header => {
          let val = row[header];
          if (val === null || val === undefined) val = '';
          val = String(val).replace(/"/g, '""');
          if (val.includes(',') || val.includes('\n') || val.includes('"')) {
            val = `"${val}"`;
          }
          return val;
        })
        .join(',')
    ),
  ].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportToPDF(
  title: string,
  subtitle: string,
  headers: string[],
  dataRows: (string | number)[][],
  filename: string
) {
  const doc = new jsPDF({
    orientation: dataRows[0] && dataRows[0].length > 5 ? 'landscape' : 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  // Header styling
  doc.setFillColor(34, 197, 94); // Farm Green
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 60, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text('THE MUTOPORAZ FARMS', 30, 36);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Livestock Operations: Pigs • Hens • Ostriches | Farm Manager: SIMBA', 30, 50);

  // Subtitle & Report details
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(title, 30, 85);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`${subtitle} | Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 30, 102);

  // AutoTable
  autoTable(doc, {
    startY: 115,
    head: [headers],
    body: dataRows,
    theme: 'striped',
    headStyles: {
      fillColor: [22, 101, 52], // dark green
      textColor: [255, 255, 255],
      fontSize: 9,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: [30, 41, 59],
    },
    alternateRowStyles: {
      fillColor: [240, 253, 244], // subtle emerald/green
    },
    margin: { left: 30, right: 30 },
  });

  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `The Mutoporaz Farms - Official Farm Record | Page ${i} of ${pageCount}`,
      30,
      doc.internal.pageSize.getHeight() - 15
    );
  }

  doc.save(`${filename}.pdf`);
}
