import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LoaderService {

  loading: any;

  constructor() { 
    this.loading = document.getElementById('loader-container');
  }

  hideLoading() {
    this.loading.classList.remove('loader');
  }

  showLoading() {
    this.loading.classList.add('loader');
  }
}
