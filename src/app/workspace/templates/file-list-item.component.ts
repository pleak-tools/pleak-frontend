import {Component, Input, ElementRef, AfterViewInit} from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { Subscriber } from 'rxjs/Subscriber';
import 'rxjs/add/operator/startWith';
import 'rxjs/add/operator/merge';
import * as moment from 'moment';
import { FilesComponent } from '../pages/files.component';

declare var $: any;

@Component({
  selector: 'file-list-item'
})
export class FileListItemComponent implements AfterViewInit {

  constructor(private elementRef: ElementRef) {
    moment.locale('en-gb');
  }

  @Input() pobject;
  @Input() parent: FilesComponent;

  lastModified = new Observable<string>((observer: Subscriber<string>) => {
    observer.next(moment(this.pobject.lastModified).fromNow());
    setInterval(() => observer.next(moment(this.pobject.lastModified).fromNow()), 1000);
  });

  ngAfterViewInit() {
    $('[data-toggle="tooltip"]', this.elementRef.nativeElement).tooltip();
  }

}
