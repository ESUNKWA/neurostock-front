import { Component, ViewEncapsulation, AfterViewInit, OnDestroy, ElementRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NzSelectModule } from 'ng-zorro-antd/select';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [FormsModule, RouterLink, NzSelectModule],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export default class LandingComponent implements AfterViewInit, OnDestroy {
  activeTab = 'pos';
  formStep = 1;
  formSubmitting = false;
  formDone = false;

  form = {
    s_nom: '', s_type: '', s_pays: '', s_ville: '', s_commune: '',
    b_nom: '', b_adr: '', b_type: 'Point de vente physique', b_devise: 'FCFA', b_caisse: false,
    r_prenom: '', r_nom: '', r_tel: '', r_email: '', r_pwd: '', r_pwd2: '',
  };
  stepErrors: Record<string, boolean> = {};

  private observer?: IntersectionObserver;
  private themeUnlisten?: () => void;

  constructor(private el: ElementRef) {}

  ngAfterViewInit(): void {
    this.initTheme();
    this.initReveal();
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.themeUnlisten?.();
  }

  private initTheme(): void {
    const host = this.el.nativeElement as HTMLElement;
    const btn = host.querySelector<HTMLElement>('.theme-btn');
    let t = localStorage.getItem('ns_t') ||
             (window.matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light');

    const apply = (theme: string) => {
      host.setAttribute('data-theme', theme);
      if (btn) btn.textContent = theme === 'dark' ? '☀' : '🌙';
      localStorage.setItem('ns_t', theme);
      t = theme;
    };
    apply(t);

    const handler = () => apply(t === 'dark' ? 'light' : 'dark');
    btn?.addEventListener('click', handler);
    this.themeUnlisten = () => btn?.removeEventListener('click', handler);
  }

  scrollTo(id: string): void {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  }

  private initReveal(): void {
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('vis'); });
    }, { threshold: 0.08, rootMargin: '0px 0px -36px 0px' });
    this.el.nativeElement.querySelectorAll('.rv').forEach((el: Element) => this.observer!.observe(el));
  }

  go(from: number, to: number): void {
    if (to > from) {
      this.stepErrors = {};
      const checks: Record<number, (keyof typeof this.form)[]> = {
        1: ['s_nom', 's_pays'],
        2: ['b_nom'],
        3: ['r_prenom', 'r_nom', 'r_tel', 'r_pwd'],
      };
      let valid = true;
      for (const field of (checks[from] ?? [])) {
        if (!String(this.form[field]).trim()) {
          this.stepErrors[field] = true;
          valid = false;
        }
      }
      if (!valid) return;
      if (from === 3) {
        if (this.form.r_pwd.length < 8) { this.stepErrors['r_pwd'] = true; return; }
        if (this.form.r_pwd !== this.form.r_pwd2) { this.stepErrors['r_pwd2'] = true; return; }
      }
    }
    this.formStep = to;
  }

  submitForm(): void {
    this.go(3, 4);
    if (Object.keys(this.stepErrors).length) return;
    this.formSubmitting = true;
    setTimeout(() => { this.formSubmitting = false; this.formDone = true; }, 2000);
  }
}
