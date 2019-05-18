
  angular.module('angularApp', [])
    .controller('investorCntrl', function($rootScope, $scope, $http, $window, $location) {

      console.log($rootScope);

      $scope.tokenFromServer = token;
      $scope.codeFromServer = code;


      $scope.serviceProviders = ["Netki", "Onfido", "IdentityMind", "Jumio", "KABN", "Republic", "Trulioo"]

      var paramValue = $location;
      console.log("value " ,paramValue);
      // Get Codes From DB
      $scope.generateLink = function(address) {

        $scope.kycLink = "https://netki.com/access_code"

        $http.get("/api/codes/" + $scope.tokenFromServer)
        .then(function(response) {
          //console.log(response.data);
          //$scope.accessCodes = response.data;
        });
      }

      $scope.change = function(value) {
          if ($scope.selectedProvider == "Netki") {
            $scope.showText = true;
            $scope.showInput = false;
          } else {
            $scope.showInput = true;
            $scope.showText = false;
          }
      };

      $scope.singleAdd = function() {

        data = {
          "provider" : $scope.selectedProvider,
          "access_code" : $scope.unique_id
        }

        $http.post("/api/codes/" + token, data)

        .then(function(response) {
          console.log(response.data);
          $scope.data = response.data;
        });

      }

      $scope.netkiAdd = function() {

        data = {
          "provider" : 'Netki',
          "access_code" : $scope.multiCodes
        }

        $http.post("/api/codes-multi/" + token, data)

        .then(function(response) {
          console.log(response.data);
          $scope.data = response.data;
        });

      }

      $scope.continueToKYC = function() {
        console.log($scope.tokenFromServer, $scope.codeFromServer);

        // Add the Investor to the Database
        data = {
          "token" : $scope.tokenFromServer,
          "code" : $scope.codeFromServer
        }

        $http.post("/api/eth_investor/" + $scope.selectedAddress, data)

        .then(function(response) {

          window.location = 'https://kyc.myverify.info/?access_code=' + data.code;

        });

      }

      // call metamask if not enabled
      $window.addEventListener('load', async function(e) {
        // Modern dapp browsers...

        //console.log($window.ethereum);

        if ($window.ethereum) {
            const web3 = new Web3(window.ethereum || window.web3.currentProvider);
            try {
                // Request account access if needed
                await ethereum.enable();
                // Acccounts now exposed

                //console.log("whats the deal", web3.eth.accounts.givenProvider.selectedAddress);

                $scope.selectedAddress = web3.eth.accounts.givenProvider.selectedAddress
                $scope.generateLink($scope.selectedAddress);
                //console.log(web3.eth.accounts.givenProvider.selectedAddress);
                //web3.eth.sendTransaction({/* ... */});

            } catch (error) {
                // User denied account access...
            }
        }
        // Legacy dapp browsers...
        else if ($window.web3) {
            $window.web3 = new Web3(web3.currentProvider);
            // Acccounts always exposed
            //web3.eth.sendTransaction({/* ... */});
        }
        // Non-dapp browsers...
        else {
            console.log('Non-Ethereum browser detected. You should consider trying MetaMask!');
        }
      })



    });
