import { Component, Input } from '@angular/core';
import { trigger, style, animate, transition } from '@angular/animations';
import { HttpClient } from '@angular/common/http';
import { ApiService } from 'app/api.service';
import 'rxjs/add/observable/forkJoin';
import { Observable } from 'rxjs/Observable';

@Component({
  selector: 'app-publish-folder-form',
  templateUrl: './publish-folder-form.component.html',
  animations: [
    trigger('pobjectPublished', [
      transition(':enter', [style({opacity: 0}), animate('100ms ease-in')]),
      transition(':leave', animate('100ms ease-out'))
    ])
  ]
})
export class PublishFolderFormComponent {
  publishing = false;
  unpublishing = false;
  @Input() pobject: any;

  constructor(private http: HttpClient, private apiService: ApiService) {
  }

  publishAllFiles(pobject: any) {
    let directory = pobject || this.pobject;
    let observables = [];

    this.publishing = true;

    directory.pobjects.forEach(item => {
      if (item.type === 'directory') {
        this.publishAllFiles(item);
      } else if (!item.published) {
        observables.push(this.apiService.updateFile(item, {published: true}));
      }
    });

    // stop spinner once all requests are completed
    Observable.forkJoin(observables).subscribe(
      () => {},
      () => {},
      () => this.publishing = false
    );
  }

  unpublishAllFiles(pobject: any) {
    let directory = pobject || this.pobject;
    let observables = [];

    this.unpublishing = true;

    directory.pobjects.forEach(item => {
      if (item.type === 'directory') {
        this.unpublishAllFiles(item);
      } else if (item.published) {
        observables.push(this.apiService.updateFile(item, {published: false}));
      }
    });

    Observable.forkJoin(observables).subscribe(
      () => {},
      () => {},
      () => this.unpublishing = false
    );
  }

}
