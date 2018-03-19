import { Component, Input } from '@angular/core';
import { FileListItemComponent } from './file-list-item.component';
import { FilesComponent } from '../pages/files.component';

@Component({
  selector: 'own-files',
  templateUrl: './ownFiles.component.html'
})
export class OwnFilesComponent extends FileListItemComponent {
  @Input() parent: FilesComponent;
}
