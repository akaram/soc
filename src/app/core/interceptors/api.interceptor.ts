import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { environment } from '../../../environments/environment';

/**
 * HTTP Interceptor to add base API URL and common headers
 */
export const apiInterceptor: HttpInterceptorFn = (req, next) => {
  // Only intercept requests that don't already have a full URL
  if (!req.url.startsWith('http')) {
    const requestUrl = req.url.startsWith('/') ? req.url : '/' + req.url;
    // Same-origin deploy: apiUrl '' keeps /auth/login on the page host (nginx :8080).
    const base = (environment.apiUrl || '').trim().replace(/\/$/, '');
    const fullUrl = base ? `${base}${requestUrl}` : requestUrl;

    const clonedRequest = req.clone({
      url: fullUrl,
      setHeaders: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    if (!environment.production) {
      console.log('API Interceptor: Request URL:', clonedRequest.url);
    }
    return next(clonedRequest);
  }
  
  return next(req);
};

