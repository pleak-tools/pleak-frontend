import { Component, Input } from '@angular/core';
import { FileListItemComponent } from './file-list-item.component';
import { FilesComponent } from '../pages/files.component';

@Component({
  selector: 'shared-files',
  templateUrl: './sharedFiles.component.html'
})
export class SharedFilesComponent extends FileListItemComponent {
  @Input() parent: FilesComponent;
}
