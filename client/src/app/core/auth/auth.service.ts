import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

export interface LoginRequest { email: string; password: string; rememberMe: boolean; }
export interface RegisterRequest { email: string; password: string; confirmPassword: string; }

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/auth';
  initializeCsrf() { return this.http.get<void>(`${this.apiUrl}/csrf`); }
  login(request: LoginRequest) { return this.http.post<void>(`${this.apiUrl}/login`, request); }
  register(request: RegisterRequest) { return this.http.post<void>(`${this.apiUrl}/register`, request); }
  logout() { return this.http.post<void>(`${this.apiUrl}/logout`, {}); }
}
