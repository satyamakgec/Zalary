angularApp.controller('navCntrl', function($scope, $rootScope, $http, $window,$uibModal, $log, $document, currentToken) {

  $scope.getValue = function (value) {
    currentToken.setToken(value.token_selected);
  }

  //--------- Web3 Code ------- Browser ///
  // call metamask if not enabled
  $window.addEventListener('load', async function(e) {
    // Modern dapp browsers...
    if ($window.ethereum) {
        const web3 = new Web3(window.ethereum || window.web3.currentProvider);
        try {
            // Request account access if needed
            await ethereum.enable();
            // Acccounts now exposed
            $scope.issuerAddress = web3.eth.accounts.givenProvider.selectedAddress;

            currentToken.setAddress($scope.issuerAddress);

            $http.get("/api/get-tokens/" + $scope.issuerAddress)
            .then(function(response) {
              console.log(response.data.listOfTokens);
              $scope.yourTokens = response.data.listOfTokens;
              //console.log(response.data.listOfTokens);
            });
        } catch (error) {
            // User denied account access...
        }
    }
    // Legacy dapp browsers...
    else if ($window.web3) {
        $window.web3 = new Web3(web3.currentProvider);
    }
    // Non-dapp browsers...
    else {
        console.log('Non-Ethereum browser detected. You should consider trying MetaMask!');
    }
  })
  //--------- Web3 Code ------- Browser ///
});
