import { Component, Input } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ApiService } from 'app/api.service';

@Component({
  selector: 'app-publish-folder-form',
  templateUrl: './publish-folder-form.component.html'
})
export class PublishFolderFormComponent {
  @Input() pobject: any;

  constructor(private http: HttpClient, private apiService: ApiService) {

  };

  publishAllFiles(pobject: any) {
    let directory = pobject || this.pobject;

    directory.pobjects.forEach(item => {
      if (item.type === 'directory') {
        this.publishAllFiles(item);
      } else if (!item.published) {
        this.apiService.updateFile(item, {published: true});
      }
    });
  }

  unpublishAllFiles(pobject: any) {
    let directory = pobject || this.pobject;

    directory.pobjects.forEach(item => {
      if (item.type === 'directory') {
        this.unpublishAllFiles(item);
      } else if (item.published) {
        this.apiService.updateFile(item, {published: false});
      }
    });
  }

}
