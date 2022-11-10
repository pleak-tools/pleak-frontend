import { Component, OnInit } from '@angular/core';
import { AuthService } from 'app/auth/auth.service';

import Modeler from 'bpmn-js/lib/Modeler';
import BpmnColorPickerModule from 'assets/colors/colors';
import { Comments } from 'assets/comments/comments';
import { SqlBPMNModdle } from 'assets/bpmn-labels-extension';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';

declare function require(name: string);
declare let $: any;
let is = (element, type) => element.$instanceOf(type);

let jwt_decode = require('jwt-decode');
let config = require('./../../config.json');
const initialBpmn = require('raw-loader!assets/newDiagram.bpmn');

@Component({
  selector: 'app-modeler',
  templateUrl: './modeler.component.html',
  styleUrls: ['./modeler.component.less']
})
export class ModelerComponent implements OnInit {

  constructor(public http: HttpClient, public authService: AuthService, private route: ActivatedRoute, private router: Router, private toastr: ToastrService) { }

  private modeler: any;
  private eventBus: any;
  private overlays: any;
  private bpmnFactory: any;

  modelId: string;

  private lastContent: string = '';

  private fileId: Number = null;
  private file: any = null;

  fileLoaded: boolean = false;

  private dataObjectSettings: any = null;
  private poolSettings: any = null;

  private lastModified: Number = null;

  getModel(): void {
    let self = this;
    self.modeler = null;
    $('#canvas').html('');
    $('.buttons-container').off('click', '#save-diagram');
    $('.buttons-container').off('click', '.buttons a');
    $(window).off('keydown');
    $(window).off('mouseup');
    self.http.get(config.backend.host + '/rest/directories/files/' + self.modelId, AuthService.loadRequestOptions()).subscribe(
      success => {
        self.file = success;
        self.fileId = self.file.id;
        if (self.file.content.length === 0) {
          // If no content added yet, show option to import or create a new model
          self.importModel();
        } else {
          // Content is already added, so just open the model
          self.openDiagram(self.file.content);
        }
        $('#fileName').val(self.file.title);
        self.lastContent = self.file.content;
        document.title = 'Pleak modeler - ' + self.file.title;
        self.lastModified = new Date().getTime();
        self.fileLoaded = true;
      },
      fail => {
        self.fileId = null;
        self.file = null;
        self.lastContent = '';
        $('.buttons-container').on('click', '.buttons a', (e) => {
          if (!$(e.target).is('.active')) {
            e.preventDefault();
            e.stopPropagation();
          }
        });

        this.toastr.error('File cannot be found or opened!', '', { disableTimeOut: true });

      }
    );
  }

  importModel(): void {
    if (this.canEdit()) {
      $('#template-selector-overlay, #template-selector').show();
      document.getElementById('importModel').onclick = (e) => {
        document.getElementById('fileImportInput').click();
      };
      document.getElementById('fileImportInput').onchange = (e: any) => {
        let file = null;
        file = e.target.files[0];
        if (!file) {
          return;
        }
        this.modeler = null;
        const reader = new FileReader();
        reader.onload = (event: any) => {
          const content = event.target.result.replace(/  +/g, ' ').replace(/entity/gi, '').replace(/\<\!DOCTYPE.+]\>/gi, ''); // Minor cleaning
          if (content.length === 0) {
            this.toastr.error('File is empty!');
          } else if (this.isXML(content)) {
            this.file.content = content;
            this.openDiagram(content);
            $('#template-selector-overlay, #template-selector').hide();
            $('#save-diagram').addClass('active');
          } else {
            this.toastr.error('File cannot be opened!', '', { disableTimeOut: true });
          }
        };
        reader.readAsText(file);
      };
      $(document).on('click', '#createNewModel', (e) => {
        this.file.content = initialBpmn;
        this.openDiagram(this.file.content);
        $('#template-selector-overlay, #template-selector').hide();
      });
    } else {
      this.toastr.error('File is empty!', '', { disableTimeOut: true });
    }
  }

  openDiagram(diagram: string): void {

    let self = this;

    if (diagram && self.modeler == null) {

      self.modeler = new Modeler({
        container: '#canvas',
        keyboard: {
          bindTo: document
        },
        moddleExtensions: {
          sqlExt: SqlBPMNModdle
        },
        additionalModules: [
          BpmnColorPickerModule
        ]
      });

      self.modeler.importXML(diagram, (error, definitions) => {
        if (!error) {
          let canvas = self.modeler.get('canvas');
          this.bpmnFactory = this.modeler.get('bpmnFactory');
          canvas.zoom('fit-viewport', 'auto');
          self.loadExportButtons();
        } else {
          this.toastr.error('File cannot be opened!', '', { disableTimeOut: true });
          this.getModel();
        }
      });

      self.eventBus = self.modeler.get('eventBus');
      self.overlays = self.modeler.get('overlays');

      // tslint:disable-next-line:no-unused-expression
      new Comments(self.overlays, self.eventBus);

      self.eventBus.on('element.click', (e) => {
        self.initDataObjectSettings(e);
        self.initPoolSettings(e);
      });

      $('.buttons-container').on('click', '#save-diagram', (e) => {
        e.preventDefault();
        e.stopPropagation();
        self.save();
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
              self.save();
              break;
          }
        }
      });

      $(window).bind('beforeunload', (e) => {
        if (self.file.content !== self.lastContent) {
          return 'Are you sure you want to close this tab? Unsaved progress will be lost.';
        }
      });

      $(document).on('click', '.delete', (e) => {
        $(document).find('.edit textarea').val('');
        self.loadExportButtons();
        $('#save-diagram').addClass('active');
      });

      $(window).keydown((e) => {
        let container = $('.comments-overlay').find('textarea');
        if (container.is(e.target) && e.which === 13 && !e.shiftKey) {
          e.preventDefault();
          self.loadExportButtons();
          $('#save-diagram').addClass('active');
        }
      });

      self.modeler.on('commandStack.changed', (e) => {
        self.loadExportButtons();
        $('#save-diagram').addClass('active');
      });

      $(document).on('input', '#fileName', () => {
        self.loadExportButtons();
        $('#save-diagram').addClass('active');
      });

    }
  }

  // Save model
  save(): void {
    let self = this;
    if ($('#save-diagram').is('.active')) {
      self.modeler.saveXML(
        {
          format: true
        },
        (err: any, xml: string) => {
          if (err) {
            console.log(err);
          } else {
            self.file.title = $('#fileName').val();
            self.file.content = xml;
            self.http.put(config.backend.host + '/rest/directories/files/' + self.fileId, self.file, AuthService.loadRequestOptions({ observe: 'response' })).subscribe(
              (success: HttpResponse<any>) => {
                if (success.status === 200 || success.status === 201) {
                  let data = success.body;
                  $('.error-message').hide();
                  $('#save-diagram').removeClass('active');

                  this.toastr.success('File saved');
                  let date = new Date();
                  self.lastModified = date.getTime();
                  localStorage.setItem('lastModifiedFileId', '"' + data.id + '"');
                  localStorage.setItem('lastModified', '"' + date.getTime() + '"');
                  if (self.fileId !== data.id) {
                    this.router.navigate(['modeler', data.id]);
                  }
                  self.file.md5Hash = data.md5Hash;
                  self.lastContent = self.file.content;
                  self.fileId = data.id;
                  document.title = 'Pleak modeler - ' + self.file.title;
                }
              },
              (fail: HttpResponse<any>) => {
                if (fail.status === 400) {
                  this.toastr.error('Incorrect file name, please use symbols: a-z, A-Z, 0-9, ".", "-", "_"');
                } else if (fail.status === 401) {
                  $('#loginModal').modal();
                } else if (fail.status === 409) {
                  delete self.file.id;
                  if (parseInt(jwt_decode(localStorage.jwt).sub) !== self.file.user.id) {
                    delete self.file.directory.id;
                    self.file.directory.title = 'root';
                  }
                  this.toastr.error('File has changed on the server. Please set new file name to save a copy.');
                }
              }
            );
          }
        });
    }
  }

  loadExportButtons(): void {
    let self = this;
    if (!self.canEdit()) {
      $('.djs-palette').hide();
    }
    if ($('#fileName').val() && $('#fileName').val().length > 0) {
      self.file.title = $('#fileName').val();
    }
    self.modeler.saveSVG((err, svg) => {
      let encodedData = encodeURIComponent(svg);
      if (svg) {
        if (self.canEdit()) {
          self.file.content = svg;
        }
        $('#download-svg').addClass('active').attr({
          'href': 'data:application/bpmn20-xml;charset=UTF-8,' + encodedData,
          'download': self.file.title + '.svg'
        });
      } else {
        $('#download-svg').removeClass('active');
      }
    });
    self.modeler.saveXML({ format: true }, (err, xml) => {
      let encodedData = encodeURIComponent(xml);
      if (xml) {
        if (self.canEdit()) {
          self.file.content = xml;
        }
        $('#download-diagram').addClass('active').attr({
          'href': 'data:application/bpmn20-xml;charset=UTF-8,' + encodedData,
          'download': self.file.title
        });
      } else {
        $('#download-diagram').removeClass('active');
      }
    });
  }

  initDataObjectSettings(event: any): void {
    this.terminateDataObjectSettings();
    if (is(event.element.businessObject, 'bpmn:DataObjectReference')) {
      this.reloadDataObjectSettings(event);
    }
  }

  reloadDataObjectSettings(event: any): void {
    this.terminateDataObjectSettings();
    const dataObject = event.element.businessObject.dataObjectRef;
    const dataObjectId = event.element.businessObject.id;
    let overlayHtml = `<div class="collection-editor" id="` + dataObjectId + `-collection-selector" style="background:white; padding:10px; border-radius:2px">`;

    if (dataObject.isCollection === true) {
      overlayHtml += `<button class="btn btn-default" id="` + dataObjectId + `-collection-off-button">-> Object</button><br>`;
    } else {
      overlayHtml += `<button class="btn btn-default" id="` + dataObjectId + `-collection-on-button">-> Collection</button><br>`;
    }
    overlayHtml += `</div>`;
    overlayHtml = $(overlayHtml);

    this.dataObjectSettings = this.overlays.add(event.element, {
      position: {
        top: -15,
        right: -30
      },
      html: overlayHtml
    });

    if (dataObject.isCollection === true) {
      $(overlayHtml).on('click', '#' + dataObjectId + '-collection-off-button', (ev1) => {
        dataObject.isCollection = false;
        this.eventBus.fire('shape.changed', event);
        this.loadExportButtons();
        $('#save-diagram').addClass('active');
        this.reloadDataObjectSettings(event);
      });
    } else {
      $(overlayHtml).on('click', '#' + dataObjectId + '-collection-on-button', (ev2) => {
        dataObject.isCollection = true;
        this.eventBus.fire('shape.changed', event);
        this.loadExportButtons();
        $('#save-diagram').addClass('active');
        this.reloadDataObjectSettings(event);
      });
    }

  }

  terminateDataObjectSettings(): void {
    if (this.dataObjectSettings != null) {
      this.overlays.remove({ id: this.dataObjectSettings });
    }
  }

  initPoolSettings(event: any): void {
    this.terminatePoolSettings();
    if (is(event.element.businessObject, 'bpmn:Participant')) {
      this.reloadPoolSettings(event);
    }
  }

  reloadPoolSettings(event: any): void {
    this.terminatePoolSettings();
    const poolObject = event.element.businessObject;
    const poolId = event.element.businessObject.id;
    let overlayHtml = `<div class="multiinstance-editor" id="` + poolId + `-multiinstance-selector" style="background:white; padding:10px; border-radius:2px">`;
    if (poolObject.participantMultiplicity) {
      overlayHtml += `<button class="btn btn-default" id="` + poolId + `-multiinstance-off-button">-> Pool</button><br>`;
    } else {
      overlayHtml += `<button class="btn btn-default" id="` + poolId + `-multiinstance-on-button">-> Multi-instance Pool</button><br>`;
    }
    overlayHtml += `</div>`;
    overlayHtml = $(overlayHtml);

    this.poolSettings = this.overlays.add(event.element, {
      position: {
        top: -15,
        right: -55
      },
      html: overlayHtml
    });
    if (poolObject.participantMultiplicity) {
      $(overlayHtml).on('click', '#' + poolId + '-multiinstance-off-button', (ev1) => {
        delete poolObject.participantMultiplicity;
        this.eventBus.fire('shape.changed', event);
        this.loadExportButtons();
        $('#save-diagram').addClass('active');
        this.reloadPoolSettings(event);
      });
    } else {
      $(overlayHtml).on('click', '#' + poolId + '-multiinstance-on-button', (ev2) => {
        let participantMultiplicity = this.bpmnFactory.create("bpmn:ParticipantMultiplicity", { minimum: 1, maximum: 10 });
        poolObject.participantMultiplicity = participantMultiplicity;
        participantMultiplicity.$parent = poolObject;
        this.eventBus.fire('shape.changed', event);
        this.loadExportButtons();
        $('#save-diagram').addClass('active');
        this.reloadPoolSettings(event);
      });
    }
  }

  terminatePoolSettings(): void {
    if (this.poolSettings != null) {
      this.overlays.remove({ id: this.poolSettings });
    }
  }


  initLoginModal(): void {
    this.authService.initLoginModal();
  }

  initLogoutModal(): void {
    this.authService.initLogoutModal();
  }

  isOwner(pobject: any): boolean {
    return this.authService.user ? pobject.user.id === parseInt(this.authService.user.sub) : false;
  }

  canEdit(): boolean {
    if (this.file != null && this.authService.user != null) {
      let file = this.file;
      if (this.isOwner(file)) return true;
      for (let pIx = 0; pIx < file.permissions.length; pIx++) {
        if (file.permissions[pIx].action.title === 'edit' && this.authService.user ? file.permissions[pIx].user.id === parseInt(this.authService.user.sub) : false) {
          return true;
        }
      }
      return false;
    }
    return false;
  }

  isXML(xml: string): boolean {
    try {
      $.parseXML(xml);
      return true;
    } catch (err) {
      return false;
    }
  }

  ngOnInit(): void {
    window.addEventListener('storage', (event: StorageEvent) => {
      if (event.storageArea === localStorage) {
        if (!this.authService.verifyToken()) {
          this.getModel();
        } else {
          let lastModifiedFileId = Number(localStorage.getItem('lastModifiedFileId').replace(/['"]+/g, ''));
          let currentFileId = null;
          if (this.file) {
            currentFileId = this.file.id;
          }
          let localStorageLastModifiedTime = Number(localStorage.getItem('lastModified').replace(/['"]+/g, ''));
          let lastModifiedTime = this.lastModified;
          if (lastModifiedFileId && currentFileId && localStorageLastModifiedTime && lastModifiedTime && lastModifiedFileId === currentFileId && localStorageLastModifiedTime > lastModifiedTime) {
            this.getModel();
          }
        }
      }
    });

    this.route.paramMap
      .subscribe((params: ParamMap) => {
        this.modelId = params.get('id');
        this.getModel();
      });

  }



}
