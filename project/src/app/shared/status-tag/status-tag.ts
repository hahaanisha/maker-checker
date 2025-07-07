import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-status-tag',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './status-tag.html',
  styleUrls: ['./status-tag.scss']
})

export class StatusTagComponent {
    @Input() status!: 'PENDING'|'ACCEPTED' | 'REJECTED' | 'DELETED'

    get statusClass(): string{
        switch (this.status){
            case 'PENDING': return 'status-pending';
            case 'ACCEPTED': return 'status-accepted';
            case 'REJECTED': return 'status-rejected';
            case 'DELETED': return 'status-deleted';
            default: return '';
        }
    }
}