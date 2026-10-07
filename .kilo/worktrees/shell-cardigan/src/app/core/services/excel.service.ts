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
}
