import { Component, NgZone } from '@angular/core';
import { trigger, style, animate, transition } from '@angular/animations';
import { ApiService } from 'app/api.service';

import { forkJoin } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { finalize } from 'rxjs/operators';

declare var $: any;

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
  pobject: any;

  constructor(private apiService: ApiService, private zone: NgZone, private toastr: ToastrService) {
  }

  initModal(pobject) {
    this.pobject = pobject;

    let $selector = $('#publishFolderForm');

    $selector.modal();

    let clearModal = () => {
      this.zone.run(() => {
        this.clearModal();
      });
      $selector.off('hidden.bs.modal', clearModal);
    };

    $selector.on('hidden.bs.modal', clearModal);
  }


  clearModal() {
    this.pobject = undefined;
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

      forkJoin(observables).pipe(
        finalize(() => {
          this.zone.run(() => this.publishing = false);
        }))
        .subscribe(() => {
          this.zone.run(() => this.toastr.success('All files published'));
        });
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

      forkJoin(observables).pipe(
        finalize(() => {
          this.zone.run(() => this.unpublishing = false);
        }))
        .subscribe(() => {
          this.zone.run(() => this.toastr.success('Public links removed'));
        });
    });
  }

}
