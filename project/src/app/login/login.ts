// src/app/login/login.component.ts
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router'; // Import RouterModule
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule], // Add RouterModule to imports
  templateUrl: './login.html',
  styleUrls: ['./login.scss']
})
export class LoginComponent {
  errorMessage = '';
  private http = inject(HttpClient);
  private router = inject(Router);
  private loginApiUrl = 'http://localhost:3000/api/login';

  onLogin(form: any): void {
    this.errorMessage = '';
    this.http.post<any>(this.loginApiUrl, {
      email: form.email,
      role: form.role,
      password: form.password
    }).subscribe({
      next: (response) => {
        if (response && response.success && response.role) {
          localStorage.setItem('role', response.role);
          localStorage.setItem('name', response.name);
          this.router.navigate(['/home']);
        } else {
          this.errorMessage = response.message || 'Invalid email, role, or password.';
        }
      },
      error: (err) => {
        console.error('Login error:', err);
        if (err.status === 401) {
          this.errorMessage = 'Invalid email, role, or password.';
        } else {
          this.errorMessage = 'Login failed. Please try again later.';
        }
      }
    });
  }
}
