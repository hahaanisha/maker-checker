// src/app/home/components/sidebar/sidebar.component.ts
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Transaction, FilterOptions } from '../interfaces/transaction.interface';

// Import nested sidebar components
import { TransactionDetailsComponent } from '../transaction-details/transaction-details';
import { TransactionHistoryComponent } from '../transaction-history/transaction-history';
import { FilterOptionsComponent } from '../filter/filter';
import { StatusTagComponent } from '../shared/status-tag/status-tag'; // Import StatusTagComponent

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    TransactionDetailsComponent,
    TransactionHistoryComponent, // Assuming you also have this component
    FilterOptionsComponent,
    StatusTagComponent // Add StatusTagComponent here
  ],
  templateUrl: './sidebar.html',
  styleUrls: ['./sidebar.scss']
})
export class SidebarComponent {
  @Input() isOpen: boolean = false;
  @Input() selectedTransaction: Transaction | null = null;
  @Input() activeTab: 'overview' | 'history' | 'filter' = 'overview';
  @Input() filterOptions!: FilterOptions; // Input for filter options

  @Output() closeSidebar = new EventEmitter<void>();
  @Output() tabChange = new EventEmitter<'overview' | 'history' | 'filter'>();
  @Output() applyFilters = new EventEmitter<FilterOptions>();
  @Output() clearFilters = new EventEmitter<void>();

  onClose(): void {
    this.closeSidebar.emit();
  }

  onTabChange(tab: 'overview' | 'history' | 'filter'): void {
    this.tabChange.emit(tab);
  }

  onApplyFilters(filters: FilterOptions): void {
    this.applyFilters.emit(filters);
  }

  onClearFilters(): void {
    this.clearFilters.emit();
  }
}
