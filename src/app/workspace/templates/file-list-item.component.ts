import { Component, Input, ElementRef, AfterViewInit, NgZone, ApplicationRef } from '@angular/core';
import { FilesComponent } from '../pages/files.component';
import { Observable } from 'rxjs';
import * as moment from 'moment';
import { distinctUntilChanged } from 'rxjs/operators';

declare var $: any;

@Component({
  selector: 'file-list-item',
  template: '<div></div>'
})
export class FileListItemComponent implements AfterViewInit {

  constructor(private elementRef: ElementRef, private zone: NgZone, private appRef: ApplicationRef) {
    moment.locale('en-gb');
  }

  Math: Math = Math;

  @Input() pobject;
  @Input() parent: FilesComponent;
  @Input() depth;

  lastModified = new Observable(observer => {
    observer.next(moment(this.pobject.lastModified).fromNow());
    // Run this outside Angular to save on perfomance. Angular does not need to check state after each setInterval
    this.zone.runOutsideAngular(() => {
      setInterval(() => observer.next(moment(this.pobject.lastModified).fromNow()), 1000);
    });

  }).pipe(distinctUntilChanged((x, y) => {
    if (x === y) {
      return true;
    } else {
      // only if changed do we update
      this.appRef.tick();
      return false;
    }
  }));

  ngAfterViewInit() {
    $('[data-toggle="tooltip"]', this.elementRef.nativeElement).tooltip();

    $('.dropdown-menu', this.elementRef.nativeElement).parent().on('show.bs.dropdown', event => {

      const $target = $(event.target);
      const $window = $(window);
      const $dropdown = $('.dropdown-menu', $target);

      const topSpace = $target.offset().top - $window.scrollTop();
      const bottomSpace = $window.height() - (topSpace + $target.innerHeight());

        if (topSpace > bottomSpace && bottomSpace < $dropdown.innerHeight()) {
          $dropdown.css('top', ($dropdown.innerHeight() + 10) * -1);
        } else {
          $dropdown.css('top', '');
        }
      }
    );

  }

}
