import { Component, OnInit, Input } from '@angular/core';
import { Http, RequestOptions, Headers } from '@angular/http';
import { AuthService } from "app/auth/auth.service";
import { RouteService } from "app/route/route.service";
import { SqlBPMNModdle } from "assets/bpmn-labels-extension";
import * as Viewer from 'bpmn-js/lib/NavigatedViewer';
import * as embeddedComments from "bpmn-js-embedded-comments";

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
          // additionalModules: [
          //   embeddedComments
          // ],
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

        // $(window).mouseup((e) => {
        //   var container = $('.comments-overlay');
        //   if (!container.is(e.target) && container.has(e.target).length === 0) {
        //     this.viewer.get('comments').collapseAll();
        //   }
        // });

        // $(window).keydown((e) => {
        //   var container = $('.comments-overlay').find('textarea');
        //   if (container.is(e.target) && e.which === 13 && !e.shiftKey) {
        //     e.preventDefault();
        //     self.save();
        //   }
        // });

        // $(document).on('click', '.delete', (e) => {
        //   self.save();
        //   $(document).find('.edit textarea').val('');
        // });

        // this.viewer.on('commandStack.changed', (e) => {
        //   self.save();
        // });

      },
      fail => {
        self.file = null;
      }
    );
  };

  // save() {
  //   // TODO
  // }

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
