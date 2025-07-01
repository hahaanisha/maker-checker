import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';

@Component({
  selector: 'app-actions-cell-renderer',
  standalone: true,
  imports: [FormsModule, CommonModule], // ✅ Must be valid Angular modules
  template: `
    <div class="action-buttons">
      <ng-container *ngIf="params.data.status === 'PENDING' && params.context.role === 'maker'">
        <button class="edit-btn" (click)="onEditClick()">Edit</button>
        <button class="delete-btn" (click)="onDeleteClick()">Delete</button>
      </ng-container>

      <ng-container *ngIf="params.data.status === 'PENDING' && params.context.role === 'checker'">
        <button class="accept-btn" (click)="onAcceptClick()">Accept</button>
        <button class="reject-btn" (click)="onRejectClick()">Reject</button>
      </ng-container>

      <ng-container *ngIf="(params.data.status === 'ACCEPTED' || params.data.status === 'REJECTED') || (params.context.role === 'maker' && params.data.status === 'DELETED')">
        -
      </ng-container>
    </div>
  `,
  styleUrls: ['./actions-cell-renderer.component.scss']
})
export class ActionsCellRendererComponent implements ICellRendererAngularComp {
  params: any;

  agInit(params: ICellRendererParams): void {
    this.params = params;
  }

  refresh(params: ICellRendererParams): boolean {
    this.params = params;
    return true;
  }

  onEditClick(): void {
    this.params.context.parentComponent.onEditClick(this.params.data);
  }

  onDeleteClick(): void {
    this.params.context.parentComponent.confirmAction('delete', this.params.data.id);
  }

  onAcceptClick(): void {
    this.params.context.parentComponent.confirmAction('accept', this.params.data.id);
  }

  onRejectClick(): void {
    this.params.context.parentComponent.promptForRejectionReason(this.params.data.id);
  }
}
