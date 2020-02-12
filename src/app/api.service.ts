import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { AuthService } from './auth/auth.service';

declare function require(name: string);

const config = require('../config.json');

@Injectable()
export class ApiService {

  constructor(private http: HttpClient) {
  }

  userExists(email: string): Observable<any> {
    return this.http.post(config.backend.host + '/rest/user/exists', { email: email }, AuthService.loadRequestOptions());
  }

  updateFile(pobject: any, values: Object = {}): Observable<any> {

    const requestItem = Object.assign({}, pobject);
    Object.assign(requestItem, values);
    delete requestItem.publicUrl;
    delete requestItem.open;

    return this.http.put(config.backend.host + '/rest/directories/files/' + pobject.id,
      requestItem,
      AuthService.loadRequestOptions()
    ).pipe(map(
      (response: any) => {
        Object.assign(pobject, response);

        if (pobject.published) {
          pobject.publicUrl = config.frontend.host + '/app/#/view/' + pobject.uri;
        } else {
          pobject.publicUrl = '';
        }
        return response;
      }
    ));
  }

  updateDirectory(directory: any, values: Object = {}): Observable<any> {

    const requestItem = Object.assign({}, directory);
    Object.assign(requestItem, values);
    delete requestItem.open;
    requestItem.pobjects = [];

    return this.http.put(config.backend.host + '/rest/directories/' + directory.id,
      requestItem,
      AuthService.loadRequestOptions()
    ).pipe(map(
      (response: any) => {
        Object.assign(directory, response);
        return response;
      }
    ));
  }

  getRootDirectory() {
    return this.http.get(config.backend.host + '/rest/directories/root', AuthService.loadRequestOptions())
  }
}
