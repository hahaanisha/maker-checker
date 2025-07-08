import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http'; // HttpClientModule is provided via app.config.ts now

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule], // HttpClientModule is provided at app level
  templateUrl: './login.html',
  styleUrls: ['./login.scss']
})
export class LoginComponent {
  errorMessage = ''; 
  private http = inject(HttpClient); 
  private router = inject(Router); 

  // Hypothetical backend login endpoint
  private loginApiUrl = 'http://localhost:3000/api/login'; // You need to implement this on your Node.js backend

  onLogin(form: any): void {
    this.errorMessage = ''; 

    this.http.post<any>(this.loginApiUrl, { role: form.role, password: form.password }).subscribe({
      next: (response) => {
       
        if (response && response.success && response.role) {
          localStorage.setItem('role', response.role);
          this.router.navigate(['/home']); 
        } else {
     
          this.errorMessage = response.message || 'Invalid role or password.';
        }
      },
      error: (err) => {
        console.error('Login error:', err);
       
        if (err.status === 401) {
          this.errorMessage = 'Invalid role or password.';
        } else {
          this.errorMessage = 'Login failed. Please try again later.';
        }
      }
    });
  }
}
