import { HttpInterceptorFn } from '@angular/common/http';

export const credentialsInterceptor: HttpInterceptorFn = (request, next) => {
  const token = document.cookie.split('; ').find((cookie) => cookie.startsWith('XSRF-TOKEN='))?.split('=')[1];
  return next(request.clone({ withCredentials: true, setHeaders: token ? { 'X-XSRF-TOKEN': decodeURIComponent(token) } : {} }));
};
