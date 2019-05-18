// START NOTES FOR PARTNERS
//  • When the create token button is clicked. The server makes necessary calls to create all transaction calls required to run the ticker/token creation process
//  • Emails will be generated by Polymath IF the user has previously registered an account with their ETH address
//  • All Blockchain call or pointing to TESTNET on KOVAN.  This must be changed to Mainnet
// END NOTES FOR PARTNERS
angular.module('angularApp', ['ui.bootstrap'])
  .controller('createCntrl', function($scope, $http, $window,$uibModal, $log, $document) {
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
                  $scope.issuerAddress = true;
                  $scope.issuerAddress = web3.eth.accounts.givenProvider.selectedAddress;

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
    $scope.formData = {};

    $scope.addUser = function() {

      //$ctrl.items = {form: $scope.formData, address: $scope.issuerAddress};
      $ctrl.open('lg')
    }

    var $ctrl = this;

  $ctrl.animationsEnabled = true;

  $ctrl.open = function (size, parentSelector) {
    var parentElem = parentSelector ?
      angular.element($document[0].querySelector('.modal-demo ' + parentSelector)) : undefined;
    var modalInstance = $uibModal.open({
      animation: $ctrl.animationsEnabled,
      ariaLabelledBy: 'modal-title',
      ariaDescribedBy: 'modal-body',
      templateUrl: 'myModalContent.html',
      controller: 'ModalInstanceCtrl',
      controllerAs: '$ctrl',
      size: size,
      backdrop: 'static',
      appendTo: parentElem,
      resolve: {
        items: function () {
          return $ctrl.items;
        }
      }
    });

    modalInstance.result.then(function (selectedItem) {
      $ctrl.selected = selectedItem;
    }, function () {
      $log.info('Modal dismissed at: ' + new Date());
    });
  };

  $ctrl.openComponentModal = function () {
    var modalInstance = $uibModal.open({
      animation: $ctrl.animationsEnabled,
      component: 'modalComponent',
      resolve: {
        items: function () {
          return $ctrl.items;
        }
      }
    });

    modalInstance.result.then(function (selectedItem) {
      $ctrl.selected = selectedItem;
    }, function () {
      $log.info('modal-component dismissed at: ' + new Date());
    });
  };

  $ctrl.openMultipleModals = function () {
    $uibModal.open({
      animation: $ctrl.animationsEnabled,
      ariaLabelledBy: 'modal-title-bottom',
      ariaDescribedBy: 'modal-body-bottom',
      templateUrl: 'stackedModal.html',
      size: 'sm',
      controller: function($scope) {
        $scope.name = 'bottom';
      }
    });

    $uibModal.open({
      animation: $ctrl.animationsEnabled,
      ariaLabelledBy: 'modal-title-top',
      ariaDescribedBy: 'modal-body-top',
      templateUrl: 'stackedModal.html',
      size: 'sm',
      controller: function($scope) {
        $scope.name = 'top';
      }
    });
  };

  $ctrl.toggleAnimation = function () {
    $ctrl.animationsEnabled = !$ctrl.animationsEnabled;
  };
  });

  angular.module('angularApp').controller('ModalInstanceCtrl', function ($uibModalInstance, items, $scope, $http) {
  var $ctrl = this;

  // check to see if the ticker is available

  $ctrl.items = items;
  $ctrl.selected = {
    //item: $ctrl.items[0]
  };

  $ctrl.ok = function () {
    $uibModalInstance.close($ctrl.selected.item);
  };

  $ctrl.cancel = function () {
    $uibModalInstance.dismiss('cancel');
  };
});
// Please note that the close and dismiss bindings are from $uibModalInstance.
angular.module('angularApp').component('modalComponent', {
  templateUrl: 'myModalContent.html',
  bindings: {
    resolve: '<',
    close: '&',
    dismiss: '&'
  },
  controller: function () {
    var $ctrl = this;

    $ctrl.$onInit = function () {
      $ctrl.items = $ctrl.resolve.items;
      $ctrl.selected = {
        item: $ctrl.items[0]
      };
    };

    $ctrl.ok = function () {
      $ctrl.close({$value: $ctrl.selected.item});
    };

    $ctrl.cancel = function () {
      $ctrl.dismiss({$value: 'cancel'});
    };
  }
});
