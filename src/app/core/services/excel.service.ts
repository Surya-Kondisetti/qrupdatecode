import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { StudentImportRow } from '../../models';

@Injectable({
  providedIn: 'root'
})
export class ExcelService {
  constructor() {}

  async parseExcelOrCSV(file: File): Promise<StudentImportRow[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const json: any[] = XLSX.utils.sheet_to_json(worksheet, { raw: false });

          const rows: StudentImportRow[] = json.map(row => ({
            roll_number: String(row['Roll Number'] || row['roll_number'] || row['RollNo'] || row['Roll'] || '').trim(),
            full_name: String(row['Student Name'] || row['full_name'] || row['Name'] || '').trim(),
            email: String(row['Email'] || row['email'] || '').trim(),
            phone: String(row['Phone'] || row['phone'] || '').trim(),
            gender: String(row['Gender'] || row['gender'] || 'male').trim(),
            branch_code: String(row['Branch'] || row['branch_code'] || row['BranchCode'] || 'CSE').trim(),
            batch_name: String(row['Batch'] || row['batch_name'] || row['BatchName'] || 'Batch 01').trim(),
            year: row['Year'] || row['year'] || 1,
            semester: row['Semester'] || row['semester'] || 1
          }));

          resolve(rows);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = (error) => reject(error);
      reader.readAsArrayBuffer(file);
    });
  }

  downloadImportTemplate(): void {
    const templateData = [
      {
        'Roll Number': '23CS101',
        'Student Name': 'Rahul Kumar',
        'Email': 'rahul.kumar@techwing.edu',
        'Phone': '+91 9876543210',
        'Gender': 'male',
        'Branch': 'CSE',
        'Batch': 'Batch 01',
        'Year': 3,
        'Semester': 5
      },
      {
        'Roll Number': '23CS102',
        'Student Name': 'Sneha Reddy',
        'Email': 'sneha.reddy@techwing.edu',
        'Phone': '+91 9876543211',
        'Gender': 'female',
        'Branch': 'CSE',
        'Batch': 'Batch 01',
        'Year': 3,
        'Semester': 5
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');

    const excelBuffer: any = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const data: Blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
    saveAs(data, 'student_import_template.xlsx');
  }

  exportToExcel(data: any[], filename: string, sheetName: string = 'Sheet1'): void {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    const excelBuffer: any = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob: Blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
    saveAs(blob, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
  }

  exportToCSV(data: any[], filename: string): void {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const csvOutput = XLSX.utils.sheet_to_csv(worksheet);
    const blob = new Blob([csvOutput], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, filename.endsWith('.csv') ? filename : `${filename}.csv`);
  }

  exportToJSON(data: any[], filename: string): void {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
    saveAs(blob, filename.endsWith('.json') ? filename : `${filename}.json`);
  }

  exportToPDF(title: string, subtitle: string, headers: string[], data: any[], filename: string): void {
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) return;

    let tableHeadersHtml = headers.map(h => `<th style="border: 1px solid #cbd5e1; padding: 8px 12px; background: #f1f5f9; color: #1e293b; text-align: left; font-size: 12px;">${h}</th>`).join('');
    
    let tableRowsHtml = data.map(row => {
      let cellsHtml = headers.map(h => `<td style="border: 1px solid #e2e8f0; padding: 8px 12px; font-size: 12px; color: #334155;">${row[h] !== undefined ? row[h] : ''}</td>`).join('');
      return `<tr>${cellsHtml}</tr>`;
    }).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 30px; color: #1e293b; }
          .header { text-align: center; border-bottom: 2px solid #0f766e; padding-bottom: 15px; margin-bottom: 20px; }
          .header h1 { color: #0f766e; margin: 0 0 5px 0; font-size: 24px; }
          .header p { color: #64748b; margin: 0; font-size: 13px; }
          .meta { display: flex; justify-content: space-between; margin-bottom: 15px; font-size: 12px; color: #475569; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          .footer { margin-top: 30px; text-align: right; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 10px; }
          @media print {
            body { margin: 15px; }
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>TECHWING ATTENDANCE MANAGEMENT SYSTEM</h1>
          <h2>${title}</h2>
          <p>${subtitle}</p>
        </div>
        <div class="meta">
          <div><strong>Department:</strong> HOD Monitor Report</div>
          <div><strong>Generated Date:</strong> ${new Date().toLocaleString()}</div>
          <div><strong>Total Records:</strong> ${data.length}</div>
        </div>
        <table>
          <thead>
            <tr>${tableHeadersHtml}</tr>
          </thead>
          <tbody>
            ${tableRowsHtml}
          </tbody>
        </table>
        <div class="footer">
          Official Report • TechWing Engineering Attendance Portal • Page 1
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  }
}

