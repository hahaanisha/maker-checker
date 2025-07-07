import { Injectable, inject } from '@angular/core';

@Injectable({
    providedIn: 'root'
})

export class DataTransfer {

    private userData: { name: string; address: string; email: string } | null = null;

    setUserData(name: string, address: string, email: string): void {
        this.userData = { name, address, email }
    }

    getUserData(): { name: string; address: string; email: string }
        | null { return this.userData; }

    clearData(): void {
        this.userData = null;
    }
}