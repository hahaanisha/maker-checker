// src/app/signup/signup.component.ts
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './signup.html',
  styleUrls: ['./signup.scss']
})
export class SignupComponent {
  errorMessage = '';
  private http = inject(HttpClient);
  private router = inject(Router);
  private signupApiUrl = 'http://localhost:3000/api/signup';

  onSignup(form: any): void {
    this.errorMessage = '';
    this.http.post<any>(this.signupApiUrl, {
      name: form.name,
      email: form.email,
      password: form.password,
      role: form.role
    }).subscribe({
      next: (response) => {
        if (response && response.success) {
          this.router.navigate(['/login']);
        } else {
          this.errorMessage = response.message || 'Signup failed. Please try again.';
        }
      },
      error: (err) => {
        console.error('Signup error:', err);
        this.errorMessage = 'Signup failed. Please try again later.';
      }
    });
  }
}
