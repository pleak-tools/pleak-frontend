'use strict';

angular.module('pleaks.user', ['ngRoute'])

.service('UserService', ['$http', '$rootScope', '$localStorage', function(http, root, localStorage) {

  this.changePassword = function(user, success, error) {
    http({
      method: 'PUT',
      url: root.config.backend.host + '/rest/user/password',
      data: {currentPassword: user.currentPassword, newPassword: user.newPassword1}
    }).then(function(response) {
      if (response.status === 200) root.user = jwt_decode(response.data.token);
        success();
    }, function(response) {
      error(response.status);
    });
  };

}]);