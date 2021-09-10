import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppComponent } from './app.component';
import { RoundedPolygonClipPathDirective } from './rounded-polygon-clip-path/rounded-polygon-clip-path.directive';

@NgModule({
    declarations: [AppComponent, RoundedPolygonClipPathDirective],
    imports: [BrowserModule],
    providers: [],
    bootstrap: [AppComponent]
})
export class AppModule {}
