import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import 'rxjs/add/operator/map';
import { Observable } from 'rxjs/Observable';

declare function require(name: string);

let config = require('../config.json');

@Injectable()
export class ApiService {

  constructor(private http: HttpClient) {
  }

  updateFile(pobject: any, values: Object = {}): Observable<any> {

    let requestItem = Object.assign({}, pobject);
    Object.assign(requestItem, values);
    delete requestItem.publicUrl;
    delete requestItem.open;

    return this.http.put(config.backend.host + '/rest/directories/files/' + pobject.id, requestItem, {headers: {'JSON-Web-Token': localStorage.jwt}}).map(
      (response: any) => {
        Object.assign(pobject, response);

        if (pobject.published) {
          pobject.publicUrl = config.frontend.host + '/app/#/view/' + pobject.uri;
        } else {
          pobject.publicUrl = '';
        }
        return response;
      }
    );
  }
}
