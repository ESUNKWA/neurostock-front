import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class HttpClientService {
  private headers = new HttpHeaders({ 'Content-Type': 'application/json' });

  constructor(private http: HttpClient) { }

  get(url: string, options: any = { headers: this.headers }) {
    return this.http.get(url, options);
  }

  getById(url: string, id: number) {
    const link = `${url}/${id}`;
    return this.http.get(link);
  }

  post(url: string, body: any, options: any = { headers: this.headers } ) {
    return this.http.post(url, body, options);
  }

  put(url: string, body: any, options: any = { headers: this.headers }) {
    return this.http.put(url, body, options);
  }

  patch(url: string, body: any, options: any = { headers: this.headers }) {
    return this.http.patch(url, body, options);
  }

  delete(url: string, options: any = { headers: this.headers }) {
    return this.http.delete(url, options);
  }
}
