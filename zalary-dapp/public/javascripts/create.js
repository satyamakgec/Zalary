// START NOTES FOR PARTNERS
//  • When the create token button is clicked. The server makes necessary calls to create all transaction calls required to run the ticker/token creation process
//  • Emails will be generated by Polymath IF the user has previously registered an account with their ETH address
//  • All Blockchain call or pointing to TESTNET on KOVAN.  This must be changed to Mainnet
// END NOTES FOR PARTNERS
angular.module('angularApp', ['ui.bootstrap'])
  .service('addedEmployee', ["$rootScope", function($rootScope) {

    addedEmployee.added = function() {
      console.log("in here");
      $rootScope.$broadcast('added', true);
    }
    return addedEmployee;
  }])
  .controller('createCntrl', function($scope, $http, $window,$uibModal, $log, $document,$rootScope) {
    //--------- Web3 Code ------- Browser ///
        // call metamask if not enabled
        $window.addEventListener('load', async function(e) {
          // Modern dapp browsers...

          $scope.pageInit();

          if ($window.ethereum) {
              const web3 = new Web3(window.ethereum || window.web3.currentProvider);
              try {
                  // Request account access if needed
                  await ethereum.enable();
                  // Acccounts now exposed
                  $scope.issuerAddress = true;
                  $scope.issuerAddress = web3.eth.accounts.givenProvider.selectedAddress;
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

    $scope.pageInit = function() {


      $http.get("/api/employees/")
      .then(function(response) {
        $scope.employees = response.data;
      })

      $http.get("/api/make-employer/")
      .then(function(response) {

        $scope.transaction = response.data.transaction;
        console.log($scope.transaction);
        // sign transaction if users is not an employer
        if($scope.transaction !== false) {

          // send getTransaction
          web3.eth.sendTransaction($scope.transaction, function(err, transactionHash) {
            if (!err)
              console.log("transactionHash");
          });
        }



      })

    }

    $scope.formData = {};

    $scope.addUser = function(employee = true) {

      console.log(employee);

      $ctrl.items = {type: "add", user: employee};
      $ctrl.open('lg')
    }

    $scope.pay = function(employee) {
        $window.location = '/payments/' + employee.id
    }

    $scope.del = function(employee) {
      $ctrl.items = {type: "del", user: employee};
      $ctrl.open('lg')
    }

    $rootScope.$on('added', function(event, data){
      $scope.getEmployees();
    })

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

  angular.module('angularApp').controller('ModalInstanceCtrl', function ($uibModalInstance, items, $scope, $http, $rootScope) {

  $scope.formData = {};

  $scope.formData.first_name = items.user.first_name;
  $scope.formData.last_name = items.user.last_name;
  $scope.formData.job_title = items.user.job_title;
  $scope.formData.wallet_address = items.user.wallet_address;
  $scope.formData.id = items.user.id;

  $scope.closeWindow = function() {
    console.log("got here");
    $uibModalInstance.dismiss('cancel');
    $rootScope.$broadcast('added', true);
  }

  $scope.deleteEmployee = function (id) {

    $http.delete("/api/employees/" + id)
    .then(function(response) {
      console.log(response);
      $scope.closeWindow();
    })


  }

  $scope.addEmployee = function (first_name, last_name, job_title, wallet_address, id) {

    var data = {id: id, first_name: first_name, last_name: last_name, job_title: job_title, wallet_address: wallet_address}

    $http.post("/api/employees/", data)
    .then(function(response) {
      $rootScope.$broadcast('added', true);
      $uibModalInstance.dismiss('cancel');
    })
  }

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
