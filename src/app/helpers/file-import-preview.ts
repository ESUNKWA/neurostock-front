import * as XLSX from 'xlsx';

export interface FilePreview {
  columns: string[];
  rows: any[];
}

/**
 * Parse un fichier CSV/XLSX/XLS côté navigateur pour en extraire un aperçu
 * (colonnes + lignes) avant envoi au backend pour l'import réel.
 */
export function parseFileToRows(file: File): Promise<FilePreview> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e: any) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[firstSheetName];
        const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });
        const columns = rows.length ? Object.keys(rows[0]) : [];
        resolve({ columns, rows });
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Génère et télécharge un fichier .xlsx de modèle avec des en-têtes
 * et une ligne d'exemple pour guider l'utilisateur avant l'import.
 */
export function downloadXlsxTemplate(headers: string[], exampleRows: Record<string, any>[], filename: string): void {
  const aoaData = [
    headers,
    ...exampleRows.map(row => headers.map(h => row[h] ?? ''))
  ];
  const ws = XLSX.utils.aoa_to_sheet(aoaData);

  // Largeur automatique des colonnes
  ws['!cols'] = headers.map(h => ({ wch: Math.max(h.length + 4, 16) }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Modèle');
  XLSX.writeFile(wb, filename);
}
