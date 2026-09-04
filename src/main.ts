import { bootstrapApplication } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';

// Use app.config.ts so auth/api interceptors attach JWT to every HttpClient call.
bootstrapApplication(AppComponent, {
  providers: [...appConfig.providers, provideAnimations()]
}).catch(err => console.error(err));
