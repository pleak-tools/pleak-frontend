import { Component, OnInit, Input } from '@angular/core';
import { Http, RequestOptions, Headers } from '@angular/http';
import { AuthService } from "app/auth/auth.service";
import { RouteService } from "app/route/route.service";
import { SqlBPMNModdle } from "assets/bpmn-labels-extension";
import * as Viewer from 'bpmn-js/lib/NavigatedViewer';
// import { Comments } from 'assets/comments/comments';

declare function require(name:string);
declare var $: any;

var config = require('./../../config.json');

@Component({
  selector: 'app-viewer',
  templateUrl: './viewer.component.html'
})
export class ViewerComponent implements OnInit {

  constructor(private http: Http, private authService: AuthService, private routeService: RouteService) {}

  @Input() authenticated: boolean;

  file;
  viewer;

  private modelId = this.routeService.getCurrentUrl().split('/')[3];

  getPublishedFile() {
    var self = this;
    self.viewer = null;
    this.http.get(config.backend.host + '/rest/directories/files/public/' + self.modelId, this.authService.loadRequestOptions()).subscribe(
      success => {
        self.file = JSON.parse((<any>success)._body);
        self.viewer = new Viewer({
          container: '#viewer-canvas',
          moddleExtensions: {
            sqlExt: SqlBPMNModdle
          }
        });
        self.viewer.importXML(self.file.content, function(err) {
          if (!err) {
            self.viewer.get('#viewer-canvas').zoom('fit-viewport');
          } else {
            // error
          }
        });
        // new Comments(self.viewer.get('overlays'), self.viewer.get('eventBus'));
        // $(document).on('click', '.toggle', (e) => {
        //   $(document).find('.edit').hide();
        //   $(document).find('.delete').hide();
        // });
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
