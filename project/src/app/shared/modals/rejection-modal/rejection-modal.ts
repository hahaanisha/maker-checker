// src/app/shared/modals/rejection-reason-modal/rejection-reason-modal.component.ts
import { Component, Input, Output, EventEmitter, ViewChild, AfterViewInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'app-rejection-reason-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './rejection-modal.html',
  styleUrls: ['./rejection-modal.scss']
})
export class RejectionReasonModalComponent implements AfterViewInit {
  @Input() transactionId: string | null = null;
  @Output() reasonSubmitted = new EventEmitter<string>();
  @Output() cancel = new EventEmitter<void>();

  @ViewChild('rejectionForm') rejectionForm!: NgForm;
  @ViewChild('reasonInput') reasonInput!: any;

  rejectionReason: string = '';
  changeDetectorRef = inject(ChangeDetectorRef);

  ngAfterViewInit(): void {
    this.changeDetectorRef.detectChanges();
  }

  onSubmit(): void {
    if (this.rejectionForm.valid && this.rejectionReason.trim() !== '') {
      this.reasonSubmitted.emit(this.rejectionReason.trim());
    } else {
      // You might want to add a visual cue to the user that the field is required
      // For example, by setting a flag and displaying an error message in the template.
    }
  }

  onCancel(): void {
    this.cancel.emit();
  }
}
