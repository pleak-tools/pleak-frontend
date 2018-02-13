import {Component, Input, ElementRef, AfterViewInit} from '@angular/core';

declare var $: any;

@Component({
  selector: 'shared-files',
  templateUrl: './sharedFiles.component.html'
})
export class SharedFilesComponent implements AfterViewInit {

  constructor(private elementRef: ElementRef) { }

  @Input() pobject;
  @Input() parent;

  ngAfterViewInit() {
    $('[data-toggle="tooltip"]', this.elementRef.nativeElement).tooltip();
  }

}
