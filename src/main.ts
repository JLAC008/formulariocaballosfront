import { bootstrapApplication } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { importProvidersFrom } from '@angular/core';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, {
  providers: [importProvidersFrom(FormsModule)]
}).catch((err) => console.error(err));
