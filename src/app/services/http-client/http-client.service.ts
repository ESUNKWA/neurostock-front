import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class HttpClientService {
  constructor(private http: HttpClient) { }

  get<T>(url: string): Observable<T> {
    return this.http.get<T>(url);
  }

  post<T>(url: string, data: any): Observable<T> {
    return this.http.post<T>(url, data);
  }

  getById<T>(url: string, id: number): Observable<T> {
    return this.http.get<T>(`${url}/${id}`);
  }

  patch<T>(url: string, data: any): Observable<T> {
    return this.http.patch<T>(url, data);
  }

  delete(url: string): Observable<void> {
    return this.http.delete<void>(url);
  }
}
