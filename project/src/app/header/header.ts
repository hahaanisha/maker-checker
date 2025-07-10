import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common'; // Import CommonModule for role?.toUpperCase()

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule], // Add CommonModule here
  templateUrl: './header.html',
  styleUrls: ['./header.scss']
})
export class Header {
  // Use a getter to reactively get the role, or update it on logout
  role: string | null = null;
  name: string | null = null;

    

  constructor(private router: Router) {
    // Listen to router events to update role if needed after login
    this.router.events.subscribe(() => {
      this.role = localStorage.getItem('role');
      this.name = localStorage.getItem('name');
  
    });
  }

  logout() {
    localStorage.clear(); // Clear all local storage items
    this.role = null; // Clear the role
    this.router.navigate(['./login']);
  }
}