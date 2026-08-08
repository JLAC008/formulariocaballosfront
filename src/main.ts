import { bootstrapApplication } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { importProvidersFrom } from '@angular/core';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, {
  providers: [importProvidersFrom(FormsModule), provideHttpClient(withFetch())]
}).catch((err) => console.error(err));
