var angularApp = angular.module('angularApp', ['ui.bootstrap']);

angularApp.service('currentToken', ["$rootScope", function($rootScope) {

  var currentToken = {};

  currentToken.setToken = function(token) {
    var currentToken = token;
    $rootScope.$broadcast('tokenChange', currentToken);
    $rootScope.$broadcast('address', address);
    //$rootScope.currentTokenRoot = token
  }

  currentToken.setAddress = function(address) {
    $rootScope.$broadcast('address', address)
  }

  return currentToken;

}]);
