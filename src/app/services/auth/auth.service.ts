import { Injectable } from '@angular/core';
import { environnement } from '../../environnement/environnement';
import { HttpClientService } from '../http-client/http-client.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly API_URL = environnement.API_URL;

  constructor(private http: HttpClientService) { }

  login(credentials: any) {
    return this.http.post(`${this.API_URL}/authentication`, credentials);
  }
}
