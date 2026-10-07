import { Component, OnInit } from '@angular/core';
import { ToastService, Toast } from '../../../core/services/toast.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-toast-container',
  templateUrl: './toast-container.component.html',
  styleUrls: ['./toast-container.component.scss']
})
export class ToastContainerComponent implements OnInit {
  toasts$!: Observable<Toast[]>;

  constructor(public toastService: ToastService) {}

  ngOnInit(): void {
    this.toasts$ = this.toastService.toasts$;
  }

  dismiss(id: string): void {
    this.toastService.dismiss(id);
  }
}
