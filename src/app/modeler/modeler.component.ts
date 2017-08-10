import { Component, OnInit, ViewEncapsulation, Input } from '@angular/core';
import { Http, RequestOptions, Headers } from '@angular/http';
import { AuthService } from "app/auth/auth.service";
import { RouteService } from "app/route/route.service";

import * as Modeler from 'bpmn-js/lib/Modeler';
import ModdleElement from 'moddle';
import { SqlBPMNModdle } from "assets/bpmn-labels-extension";
import * as embeddedComments from "bpmn-js-embedded-comments";

declare function require(name:string);
declare var $: any;
let is = (element, type) => element.$instanceOf(type);

var jwt_decode = require('jwt-decode');
var config = require('./../../config.json');
const initialBpmn = require('raw-loader!assets/newDiagram.bpmn');

@Component({
  selector: 'app-modeler',
  templateUrl: './modeler.component.html',
  styleUrls: ['./modeler.component.less']
})
export class ModelerComponent implements OnInit {

  constructor(public http: Http, private authService: AuthService, private routeService: RouteService) {
    this.authService.authStatus.subscribe(status => {
      this.authenticated = status;
      this.getModel();
    });
  }

  private modeler;
  private eventBus;
  private overlays;

  private modelId = this.routeService.getCurrentUrl().split('/')[3];

  private saveFailed: Boolean = false;
  private lastContent: String = '';

  private fileId: Number = null;
  private file: any;

  @Input() authenticated: boolean;
  private fileLoaded = false;

  private dataObjectSettings = null;

  isAuthenticated() {
    return this.authenticated;
  }

  getModel() {
    var self = this;
    self.modeler = null;
    $('#canvas').html('');
    $('.buttons-container').off('click', '#save-diagram');
    $('.buttons-container').off('click', '.buttons a');
    $(window).off('keydown');
    $(window).off('mouseup');
    this.http.get(config.backend.host + '/rest/directories/files/' + self.modelId, this.authService.loadRequestOptions()).subscribe(
      success => {
        self.file = JSON.parse((<any>success)._body);
        self.fileId = self.file.id;
        if (self.file.content.length === 0) {
          self.file.content = initialBpmn;
        }
        self.openDiagram(self.file.content);
        $('#fileName').val(self.file.title);
        self.lastContent = self.file.content;
        document.title = 'Pleak editor - ' + self.file.title;
        self.fileLoaded = true;
      },
      fail => {
        self.fileId = null;
        self.file = null;
        self.lastContent = '';
        self.saveFailed = false;
        $('.buttons-container').on('click', '.buttons a', (e) => {
          if (!$(e.target).is('.active')) {
            e.preventDefault();
            e.stopPropagation();
          }
        });
        $('#fileCannotBeOpenedError').show();
      }
    );
  }

  openDiagram(diagram: String) {

    let self = this;

    if (diagram && this.modeler == null) {
      
      this.modeler = new Modeler({
        container: '#canvas',
        keyboard: {
          bindTo: document 
        },
        additionalModules: [
          embeddedComments
        ],
        moddleExtensions: {
          sqlExt: SqlBPMNModdle
        }
      });

      this.modeler.importXML(diagram, (error, definitions) => {
        var canvas = this.modeler.get('canvas');
        canvas.zoom('fit-viewport');
      });

      this.eventBus = this.modeler.get('eventBus');
      this.overlays = this.modeler.get('overlays');

      this.eventBus.on('element.click', (e) => {
        this.initDataObjectSettings(e);
      });

      $('.buttons-container').on('click', '#save-diagram', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.save();
      });

      $('.buttons-container').on('click', '.buttons a', (e) => {
        if (!$(e.target).is('.active')) {
          e.preventDefault();
          e.stopPropagation();
        }
      });

      $(window).on('keydown', (e) => {
        if (e.ctrlKey || e.metaKey) {
          switch (String.fromCharCode(e.which).toLowerCase()) {
            case 's':
              event.preventDefault();
              this.save();
              break;
          }
        }
      });

      $(window).bind('beforeunload', (e) => {
        if (this.file.content != this.lastContent) {
          return 'Are you sure you want to close this tab? Unsaved progress will be lost.';
        }
      });

      $(window).mouseup((e) => {
        var container = $('.comments-overlay');
        if (!container.is(e.target) && container.has(e.target).length === 0) {
          this.modeler.get('comments').collapseAll();
        }
      });

      $(window).keydown((e) => {
        var container = $('.comments-overlay').find('textarea');
        if (container.is(e.target) && e.which === 13 && !e.shiftKey) {
          e.preventDefault();
          self.loadExportButtons();
        }
      });

      this.modeler.on('commandStack.changed', (e) => {
        self.loadExportButtons()
      });

      $('#fileName').on('input', () => {
	      this.loadExportButtons();
      });
    }
  }

  // Save model
  save() {
    var self = this;
    if ($('#save-diagram').is('.active')) {
      this.modeler.saveXML(
      {
        format: true
      },
      (err: any, xml: string) => {
        if (err) {
          console.log(err)
        } else {
          this.file.title = $('#fileName').val();
          self.file.content = xml;
          this.http.put(config.backend.host + '/rest/directories/files/' + self.fileId, self.file, this.authService.loadRequestOptions()).subscribe(
            success => {
              console.log(success)
              if (success.status === 200 || success.status === 201) {
                var data = JSON.parse((<any>success)._body);
                $('#fileSaveSuccess').show();
                $('#fileSaveSuccess').fadeOut(5000);
                $('#save-diagram').removeClass('active');
                var date = new Date();
                localStorage.setItem("lastModifiedFileId", '"' + data.id + '"');
                localStorage.setItem("lastModified", '"' + date.getTime() + '"');
                if (self.fileId !== data.id) {
                  window.location.href = config.frontend.host + '/#/modeler/' + data.id;
                }
                self.file.md5Hash = data.md5Hash;
                self.lastContent = self.file.content;
                self.fileId = data.id;
                self.saveFailed = false;
              } else if (success.status === 400) {
                self.saveFailed = true;
                $('#fileNameError').show();
              } else if (success.status === 401) {
                self.saveFailed = true;
                $('#loginModal').modal();
              } else if (success.status === 409) {
                self.saveFailed = true;
                delete self.file.id;
                if (parseInt(jwt_decode(localStorage.jwt).sub) !== self.file.user.id) {
                  delete self.file.directory.id;
                  self.file.directory.title = 'root';
                }
                $('#fileContentError').show();
              }
            },
            fail => {
            }
          );
          console.log(xml)
        }
      });
    }
  }

  loadExportButtons() {
    var self = this;
    self.file.title = $('#fileName').val();
    $('#save-diagram').addClass('active');
    self.modeler.saveSVG((err, svg) => {
      var encodedData = encodeURIComponent(svg);
      if (svg) {
        self.file.content = svg;
        $('#download-svg').addClass('active').attr({
          'href': 'data:application/bpmn20-xml;charset=UTF-8,' + encodedData,
          'download': name
        });
      } else {
        $('#download-svg').removeClass('active');
      }
    });
    self.modeler.saveXML({ format: true }, (err, xml) => {
      var encodedData = encodeURIComponent(xml);
      if (xml) {
        self.file.content = xml;
        $('#download-diagram').addClass('active').attr({
          'href': 'data:application/bpmn20-xml;charset=UTF-8,' + encodedData,
          'download': name
        });
      } else {
        $('#download-diagram').removeClass('active');
      }
    });
  }

  initDataObjectSettings(event) {

    let self = this;

    this.terminateDataObjectSettings();

    if (is(event.element.businessObject, 'bpmn:DataObjectReference')) {

      let dObj = event.element.businessObject.dataObjectRef;
      let overlayHtml = `<div class="collection-editor" id="` + event.element.businessObject.id + `-collection-selector" style="background:white; padding:10px; border-radius:2px">`;

      if (event.element.businessObject.dataObjectRef.isCollection == true) {
        overlayHtml += `<button id="` + event.element.businessObject.id + `-collection-off-button">Turn to Data Object</button><br>`;
      } else {
        overlayHtml += `<button id="` + event.element.businessObject.id + `-collection-on-button">Turn to Data Object Collection</button><br>`;
      }
      overlayHtml += `</div>`;
      overlayHtml = $(overlayHtml);

      this.dataObjectSettings = this.overlays.add(event.element, {
        position: {
          bottom: 0,
          right: 0
        },
        html: overlayHtml
      });

      if (event.element.businessObject.dataObjectRef.isCollection == true) {
        $(overlayHtml).on('click', '#' + event.element.businessObject.id + '-collection-off-button', (ev1) => {
          dObj.isCollection = false;
          self.eventBus.fire('shape.changed', event);
          self.loadExportButtons();
          self.terminateDataObjectSettings();
        });
      } else {
        $(overlayHtml).on('click', '#' + event.element.businessObject.id + '-collection-on-button', (ev2) => {
          dObj.isCollection = true;
          self.eventBus.fire('shape.changed', event);
          self.loadExportButtons();
          self.terminateDataObjectSettings();
        });
      }

    } 

  }

  terminateDataObjectSettings() {
    if (this.dataObjectSettings != null) {
      this.overlays.remove({id: this.dataObjectSettings});
    }
  }

  getCurrentLocation() {
    return this.routeService.getCurrentUrl();
  }

  initLoginModal() {
    this.authService.initLoginModal();
  }

  initLogoutModal() {
    this.authService.initLogoutModal();
  }

  ngOnInit() {
    var self = this;
    window.addEventListener('storage', function(e) {
      if (e.storageArea === localStorage) {
        self.authService.verifyToken();
        self.getModel();
      }
    });
    this.getModel();
  }

}