// src/app/status-cell-renderer/status-cell-renderer.component.ts
import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';

@Component({
  selector: 'app-status-cell-renderer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span [ngClass]="{
      'status-pending': value === 'PENDING',
      'status-accepted': value === 'ACCEPTED',
      'status-rejected': value === 'REJECTED',
      'status-deleted': value === 'DELETED'
    }">
      {{ value }}
    </span>
  `,
  styleUrls: ['./status-cell-renderer.component.scss']
})
export class StatusCellRendererComponent implements ICellRendererAngularComp {
  value: any; // The value of the cell (e.g., 'PENDING', 'ACCEPTED')

  // agInit is called by AG Grid to initialize the cell renderer
  agInit(params: ICellRendererParams): void {
    this.value = params.value;
  }

  // refresh is called by AG Grid to update the cell renderer
  refresh(params: ICellRendererParams): boolean {
    this.value = params.value;
    return true; // Return true to indicate that the component can refresh
  }
}
