// src/app/home/components/sidebar/components/filter-options/filter-options.component.ts
import { Component, Input, Output, EventEmitter, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FilterOptions } from '../interfaces/transaction.interface';

@Component({
  selector: 'app-filter',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [DatePipe],
  templateUrl: './filter.html',
  styleUrls: ['./filter.scss']
})
export class FilterOptionsComponent implements OnInit {
  @Input() initialFilterOptions!: FilterOptions; 
  @Output() applyFilters = new EventEmitter<FilterOptions>();
  @Output() clearFilters = new EventEmitter<void>();

  currentFilterOptions!: FilterOptions; 

  datePipe = inject(DatePipe);

  ngOnInit(): void {
    
    this.currentFilterOptions = JSON.parse(JSON.stringify(this.initialFilterOptions));
  }

  onDateRangeChange(range: 'thisWeek' | 'lastMonth' | 'custom' | 'all'): void {
    this.currentFilterOptions.dateRange = range;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (range === 'thisWeek') {
        const firstDayOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
        this.currentFilterOptions.fromDate = this.datePipe.transform(firstDayOfWeek, 'yyyy-MM-dd') || '';
        this.currentFilterOptions.toDate = this.datePipe.transform(new Date(), 'yyyy-MM-dd') || '';
    } else if (range === 'lastMonth') {
        const firstDayOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastDayOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
        this.currentFilterOptions.fromDate = this.datePipe.transform(firstDayOfLastMonth, 'yyyy-MM-dd') || '';
        this.currentFilterOptions.toDate = this.datePipe.transform(lastDayOfLastMonth, 'yyyy-MM-dd') || '';
    } else if (range === 'all') {
        this.currentFilterOptions.fromDate = '';
        this.currentFilterOptions.toDate = '';
    }
  }

  onApplyFilters(): void {
    this.applyFilters.emit(this.currentFilterOptions);
  }

  onClearFilters(): void {
    // Reset to default filter options
    this.currentFilterOptions = {
      referenceNo: '',
      transferFrom: '',
      transferTo: '',
      statuses: { PENDING: false, ACCEPTED: false, REJECTED: false, DELETED: false },
      dateRange: 'custom',
      fromDate: '',
      toDate: ''
    };
    this.clearFilters.emit(); 
  }
}
