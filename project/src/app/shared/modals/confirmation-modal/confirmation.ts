import { Component, Input,Output,EventEmitter} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-confirmation-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './confirmation-modal.html',
  styleUrls: ['./confirmation-modal.scss']
})
export class ConfirmationModalComponent {
    @Input() message: string='Are you sure?';
    @Output() confirmed= new EventEmitter<void>();
    @Output() cancelled= new EventEmitter<void>();

  onConfirm(): void{
    this.confirmed.emit()
  }
  onCancelled(): void{
    this.cancelled.emit()
  }
}
