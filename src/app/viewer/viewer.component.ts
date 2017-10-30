import { Component, OnInit, Input } from '@angular/core';
import { Http, RequestOptions, Headers } from '@angular/http';
import { AuthService } from "app/auth/auth.service";
import { RouteService } from "app/route/route.service";
import { SqlBPMNModdle } from "assets/bpmn-labels-extension";
import * as Viewer from 'bpmn-js/lib/NavigatedViewer';
import { ElementsHandler } from "../../../../pleak-pe-bpmn-editor/src/app/editor/handler/elements-handler"; // If you don't have PE-BPMN editor installed, comment this line out!
// import { Comments } from 'assets/comments/comments';

declare var $: any;
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
        if (success.status == 200) {
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
        $(window).on('wheel', (event) => {
          // Change the color of stereotype labels more visible when zooming out
          var zoomLevel = self.viewer.get('canvas').zoom();
          if (zoomLevel < 1.0) {
            if ($('.stereotype-label-color').css("color") != "rgb(0, 0, 255)") {
              $('.stereotype-label-color').css('color','blue');
            }
          } else {
            if ($('.stereotype-label-color').css("color") != "rgb(0, 0, 139)") {
              $('.stereotype-label-color').css('color','darkblue');
            }
          }
        });
        $('.nothing-found').hide();
      } else {
        self.file = undefined;
        $('.nothing-found').show();
      }

      },
      fail => {
        self.file = undefined;
        $('.nothing-found').show();
      }
    );
  };

  getFileName() {
    if (this.file) {
      return this.file.title;
    } else {
      return null;
    }
  }

  nothingFound() {
    return this.file === undefined;
  }

  ngOnInit() {
    this.getPublishedFile();
  }

}
