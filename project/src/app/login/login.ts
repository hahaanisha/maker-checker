import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './login.html',
  styleUrls: ['./login.scss']
})
export class LoginComponent {
  errorMessage = ''; // Message to display on login failure

  constructor(private http: HttpClient, private router: Router) {}

  /**
   * Handles the login form submission.
   * Authenticates user against role.json and redirects on success.
   * @param form The form data submitted by the user.
   */
  onLogin(form: any): void {
    this.errorMessage = ''; // Clear previous error messages
    this.http.get<any[]>('assets/data/role.json').subscribe({
      next: (roles) => {
        const user = roles.find(
          r => r.role === form.role && r.password === form.password
        );

        if (user) {
          localStorage.setItem('role', user.role); // Store the role in local storage
          this.router.navigate(['/home']); // Navigate to the home page
        } else {
          this.errorMessage = 'Invalid role, role ID, or password.'; // Set error message
        }
      },
      error: (err) => {
        console.error('Error loading roles data:', err);
        this.errorMessage = 'Could not load login data. Please try again later.';
      }
    });
  }
}