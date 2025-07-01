import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from './header/header';
import { CommonModule } from '@angular/common'; // Import CommonModule for *ngIf

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, Header, CommonModule], // Include CommonModule
  templateUrl: './app.html',
  styleUrls: ['./app.scss']
})
export class App {
  title = 'maker-checker-app';

  // Function to check if user is logged in to conditionally show header
  isLoggedIn(): boolean {
    return !!localStorage.getItem('role');
  }
}