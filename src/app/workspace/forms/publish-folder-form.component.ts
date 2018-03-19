import { Component, Input, NgZone } from '@angular/core';
import { trigger, style, animate, transition } from '@angular/animations';
import { ApiService } from 'app/api.service';
import 'rxjs/add/observable/forkJoin';
import 'rxjs/add/operator/finally';
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

  constructor(private apiService: ApiService, private zone: NgZone) {
  }

  publishAllFiles() {
    let observables = [];

    this.publishing = true;

    let recursion = (dir) => {
      dir.pobjects.forEach(item => {
        if (item.type === 'directory') {
          recursion(item);
        } else if (!item.published) {
          observables.push(this.apiService.updateFile(item, {published: true}));
        }
      });
    };

    this.zone.runOutsideAngular(() => {
      recursion(this.pobject);

      Observable.forkJoin(observables)
        .finally(() => {
          this.zone.run(() => this.publishing = false);
        })
        .subscribe();
    });
  }

  unpublishAllFiles() {
    let observables = [];

    this.unpublishing = true;

    let recursion = (dir) => {
      dir.pobjects.forEach(item => {
        if (item.type === 'directory') {
          recursion(item);
        } else if (item.published) {
          observables.push(this.apiService.updateFile(item, {published: false}));
        }
      });
    };

    this.zone.runOutsideAngular(() => {
      recursion(this.pobject);

      Observable.forkJoin(observables)
        .finally(() => {
          this.zone.run(() => this.unpublishing = false);
        })
        .subscribe();
    });
  }

}
