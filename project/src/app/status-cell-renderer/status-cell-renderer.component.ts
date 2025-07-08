import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';

import { StatusTagComponent } from '../shared/status-tag/status-tag'; // Import StatusTagComponent

@Component({
  selector: 'app-status-cell-renderer',
  standalone: true,
  imports: [CommonModule, StatusTagComponent], // Add StatusTagComponent to imports
  template: `
    <app-status-tag [status]="value"></app-status-tag>
  `,
  styleUrls: ['./status-cell-renderer.component.scss']
})
export class StatusCellRendererComponent implements ICellRendererAngularComp {
  value: any;

  agInit(params: ICellRendererParams): void {
    this.value = params.value;
  }

  refresh(params: ICellRendererParams): boolean {
    this.value = params.value;
    return true;
  }
}
