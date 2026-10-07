import { Component, OnInit } from '@angular/core';
import { ArchiveService } from '../../core/services/archive.service';
import { ToastService } from '../../core/services/toast.service';
import { AttendanceArchive } from '../../models';

@Component({
  selector: 'app-archives-manager',
  templateUrl: './archives-manager.component.html',
  styleUrls: ['./archives-manager.component.scss']
})
export class ArchivesManagerComponent implements OnInit {
  archives: AttendanceArchive[] = [];
  isProcessing = false;

  constructor(
    private archiveService: ArchiveService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.archives = this.archiveService.getArchives();
  }

  async closeActiveMonth(): Promise<void> {
    if (confirm('Closing the active attendance month will lock the period and generate a downloadable archive package. Past attendance will remain preserved in the system. Proceed?')) {
      this.isProcessing = true;
      try {
        const periodLabel = 'September 2026';
        await this.archiveService.closeAndArchiveMonth(periodLabel, 9, 2026);
        this.archives = this.archiveService.getArchives();
        this.toastService.showSuccess(`September 2026 archived and ZIP generated!`);
      } catch (err) {
        this.toastService.showError('Archival error');
      } finally {
        this.isProcessing = false;
      }
    }
  }

  async downloadArchiveZip(archive: AttendanceArchive): Promise<void> {
    await this.archiveService.downloadArchiveZip(archive.period_label);
    this.toastService.showSuccess(`Downloaded TechWing_Attendance_Archive_${archive.period_label.replace(/\s+/g, '_')}.zip`);
  }
}
