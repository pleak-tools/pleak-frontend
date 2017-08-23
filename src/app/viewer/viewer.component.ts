import { Component, OnInit, Input } from '@angular/core';
import { Http, RequestOptions, Headers } from '@angular/http';
import { AuthService } from "app/auth/auth.service";
import { RouteService } from "app/route/route.service";
import { SqlBPMNModdle } from "assets/bpmn-labels-extension";
import * as Viewer from 'bpmn-js/lib/NavigatedViewer';
import { ElementsHandler } from "../../../../pe-bpmn-editor/src/app/editor/handler/elements-handler"; // If you don't have PE-BPMN editor installed, comment this line out!
// import { Comments } from 'assets/comments/comments';

declare function require(name:string);

let config = require('./../../config.json');

@Component({
  selector: 'app-viewer',
  templateUrl: './viewer.component.html'
})
export class ViewerComponent implements OnInit {

  constructor(private http: Http, private authService: AuthService, private routeService: RouteService) {}

  @Input() authenticated: boolean;

  file;
  viewer: Viewer;

  private modelId = this.routeService.getCurrentUrl().split('/')[3];

  getPublishedFile() {
    let self = this;
    self.viewer = null;
    self.http.get(config.backend.host + '/rest/directories/files/public/' + self.modelId, self.authService.loadRequestOptions()).subscribe(
      success => {
        self.file = JSON.parse((<any>success)._body);
        self.viewer = new Viewer({
          container: '#viewer-canvas',
          moddleExtensions: {
            sqlExt: SqlBPMNModdle
          }
        });
        self.viewer.importXML(self.file.content, (err) => {
          if (!err) {
            self.viewer.get('#viewer-canvas').zoom('fit-viewport');
          }
        });
        new ElementsHandler(self.viewer, self.file.content, self, "public");  // If you don't have PE-BPMN editor installed, comment this line out!
      },
      fail => {
        self.file = null;
      }
    );
  };

  getFileName() {
    return this.file.title;
  }

  nothingFound() {
    return this.file === undefined;
  }

  ngOnInit() {
    this.getPublishedFile();
  }

}
