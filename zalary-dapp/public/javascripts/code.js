
  angular.module('angularApp', [])
    .controller('codeCntrl', function($scope, $http, $window) {

      $scope.serviceProviders = ["Netki", "Onfido", "IdentityMind", "Jumio", "KABN", "Republic", "Trulioo"]

      $scope.token = token;

      // Get Codes From DB
      $scope.getCodes = function(address) {
        $http.get("/api/codes/" + token)
        .then(function(response) {
          console.log(response.data);
          $scope.accessCodes = response.data;
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

        $http.post("/api/codes/" + $scope.selectedAddress, data)
        .then(function(response) {
          console.log(response.data);
          $scope.data = response.data;
          $scope.getCodes();
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
          $scope.getCodes();
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

                $scope.selectedAddress = web3.eth.accounts.givenProvider.selectedAddress

                $scope.getCodes($scope.selectedAddress);
                console.log(web3.eth.accounts.givenProvider.selectedAddress);
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


      $scope.doSomething = function(record) {

        $http.post("/api/whitelist", record)
        .then(function(response) {

            var data = JSON.stringify(response.data.parameter);

            web3.eth.sendTransaction(response.data.parameter, function(err, transactionHash) {
              if (!err)
                console.log("transactionHash");
            });

        });
      };

    });
