import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

declare function require(name: string);

let config = require('../config.json');

@Injectable()
export class ApiService {

  constructor(private http: HttpClient) {
  }

  updateFile(pobject: any, values: Object = {}) {

    let requestItem = Object.assign({}, pobject);
    Object.assign(requestItem, values);
    delete requestItem.publicUrl;
    delete requestItem.open;

    this.http.put(config.backend.host + '/rest/directories/files/' + pobject.id, requestItem, {headers: {'JSON-Web-Token': localStorage.jwt}}).subscribe(
      (response: any) => {
        Object.assign(pobject, response);

        if (pobject.published) {
          pobject.publicUrl = config.frontend.host + '/app/#/view/' + pobject.uri;
        } else {
          pobject.publicUrl = '';
        }
      },
      error => {

      }
    );
  }
}
