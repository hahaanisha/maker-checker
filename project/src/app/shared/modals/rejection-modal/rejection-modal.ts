// src/app/shared/modals/rejection-reason-modal/rejection-reason-modal.component.ts
import { Component, Input, Output, EventEmitter, ViewChild, AfterViewInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { ChangeDetectorRef } from '@angular/core'; // Import ChangeDetectorRef

@Component({
  selector: 'app-rejection-reason-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './rejection-modal.html',
  styleUrls: ['./rejection-modal.scss']
})
export class RejectionReasonModalComponent implements AfterViewInit {
  @Input() transactionId: string | null = null; // For single transaction context
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
    console.log('[RejectionReasonModal] onSubmit called.');
    console.log(`[RejectionReasonModal] Form valid: ${this.rejectionForm?.valid}`);
    console.log(`[RejectionReasonModal] Reason input valid: ${this.reasonInput?.valid}`);
    console.log(`[RejectionReasonModal] Rejection reason: "${this.rejectionReason}"`);

    if (this.rejectionForm.valid && this.rejectionReason.trim() !== '') {
      this.reasonSubmitted.emit(this.rejectionReason.trim());
    } else {
      console.warn('[RejectionReasonModal] Form is invalid or reason is empty. Not submitting.');
  
    }
  }

  onCancel(): void {
    this.cancel.emit();
  }
}
