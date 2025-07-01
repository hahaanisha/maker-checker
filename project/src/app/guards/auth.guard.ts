import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const role = localStorage.getItem('role'); // Check if a role is stored

  if (role) {
    return true; // User is logged in
  } else {
    router.navigate(['/login']); // Redirect to login page
    return false; // User is not logged in
  }
};