// START NOTES FOR PARTNERS
//  • When the create token button is clicked. The server makes necessary calls to create all transaction calls required to run the ticker/token creation process
//  • Emails will be generated by Polymath IF the user has previously registered an account with their ETH address
//  • All Blockchain call or pointing to TESTNET on KOVAN.  This must be changed to Mainnet
// END NOTES FOR PARTNERS
angular.module('angularApp', ['ui.bootstrap'])
  .controller('createCntrl', function($scope, $http, $window, $uibModal, $log, $document, $q) {
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

          $scope.getPayments();

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

    $scope.getPayments = function() {
      $http.get("/api/payments/")
        .then(function(response) {

          $scope.payments = response.data.payments
          //console.log(response.data);

        })
    }

    $scope.fundAccount = function() {

      function fundAccount() {
        let defer = $q.defer();
        $http.get("/api/payments-fund/")
          .then(response => {

            web3.eth.sendTransaction(response.data.daiTransaction, function(err, transactionHash) {
              if (err) {

              } else {
                $q.resolve(transactionHash);


                web3.eth.sendTransaction(response.data.transaction, function(err, transactionHash) {
                  if (err) {

                  } else {

                  }

                });
              }
            });
          }, reason => {
            $q.reject(reason);
          });
        return defer.promise;
      }
      fundAccount();
    }

    var $ctrl = this;

    $ctrl.animationsEnabled = true;

    $ctrl.open = function(size, parentSelector) {
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
          items: function() {
            return $ctrl.items;
          }
        }
      });

      modalInstance.result.then(function(selectedItem) {
        $ctrl.selected = selectedItem;
      }, function() {

      });
    };

    $ctrl.openComponentModal = function() {
      var modalInstance = $uibModal.open({
        animation: $ctrl.animationsEnabled,
        component: 'modalComponent',
        resolve: {
          items: function() {
            return $ctrl.items;
          }
        }
      });

      modalInstance.result.then(function(selectedItem) {
        $ctrl.selected = selectedItem;
      }, function() {
        $log.info('modal-component dismissed at: ' + new Date());
      });
    };

    $ctrl.openMultipleModals = function() {
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

    $ctrl.toggleAnimation = function() {
      $ctrl.animationsEnabled = !$ctrl.animationsEnabled;
    };

    $scope.addPayment = function(employee_id = false) {

      if (employee_id == false) {
        $ctrl.items = {
          user: {
            id: null
          }
        };
      }

      $ctrl.open('lg')
    }


    if (employee_id != null) {
      $scope.employee_id = employee_id;
      $ctrl.items = {
        user: {
          id: employee_id
        }
      }
      $scope.addPayment(employee_id);
    }



  });

angular.module('angularApp').controller('ModalInstanceCtrl', function($uibModalInstance, items, $scope, $http) {

  $scope.employee = {};
  $scope.formData = {};

  $scope.getEmployees = function() {

    var link = '/api/employees/';

    if (items.user.id != null) {
      link = '/api/employees/' + items.user.id;
    }

    $http.get(link)
      .then(function(response) {

        $scope.employees = response.data;

      })

  }

  $scope.getEmployees();

  $scope.schedulePayment = function(employee, start, end, amount) {

    var date1 = moment($scope.formData.dt).unix()
    var date2 = moment($scope.formData.dt2).unix()

    data = {wallet: $scope.formData.employee.wallet_address, s: date1, e: date2, amount: $scope.formData.amount}

    $http.post('/api/payments-schedule/', data).
    then(function(response){

      web3.eth.sendTransaction(response.data.transaction, function(err, transactionHash) {
        if (!err) {

          //$rootScope.broadcast("", )
          $uibModalInstance.dismiss('cancel');

        }

      });

    });

  }


  ///// ------- METHODS FOR TOOLS ------------/////

  $scope.today = function() {
    $scope.dt = new Date();
  };
  $scope.today();

  $scope.clear = function() {
    $scope.dt = null;
  };

  $scope.inlineOptions = {
    customClass: getDayClass,
    minDate: new Date(),
    showWeeks: true
  };

  $scope.dateOptions = {
    //dateDisabled: disabled,
    formatYear: 'yy',
    maxDate: new Date(2020, 7, 22),
    minDate: new Date(),
    startingDay: 1
  };

  // Disable weekend selection
  function disabled(data) {
    var date = data.date,
      mode = data.mode;
    return mode === 'day' && (date.getDay() === 0 || date.getDay() === 6);
  }

  $scope.toggleMin = function() {
    $scope.inlineOptions.minDate = $scope.inlineOptions.minDate ? null : new Date();
    $scope.dateOptions.minDate = $scope.inlineOptions.minDate;
  };

  $scope.toggleMin();

  $scope.open1 = function() {
    $scope.popup1.opened = true;
  };

  $scope.open2 = function() {
    $scope.popup2.opened = true;
  };

  $scope.setDate = function(year, month, day) {
    $scope.dt = new Date(year, month, day);
  };

  $scope.formats = ['dd-MMMM-yyyy', 'yyyy/MM/dd', 'dd.MM.yyyy', 'shortDate'];
  $scope.format = $scope.formats[0];
  $scope.altInputFormats = ['M!/d!/yyyy'];

  $scope.popup1 = {
    opened: false
  };

  $scope.popup2 = {
    opened: false
  };

  var tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  var afterTomorrow = new Date();
  afterTomorrow.setDate(tomorrow.getDate() + 1);
  $scope.events = [{
      date: tomorrow,
      status: 'full'
    },
    {
      date: afterTomorrow,
      status: 'partially'
    }
  ];

  function getDayClass(data) {
    var date = data.date,
      mode = data.mode;
    if (mode === 'day') {
      var dayToCheck = new Date(date).setHours(0, 0, 0, 0);

      for (var i = 0; i < $scope.events.length; i++) {
        var currentDay = new Date($scope.events[i].date).setHours(0, 0, 0, 0);

        if (dayToCheck === currentDay) {
          return $scope.events[i].status;
        }
      }
    }

    return '';
  }

  var $ctrl = this;

  // check to see if the ticker is available

  $ctrl.items = items;
  $ctrl.selected = {
    //item: $ctrl.items[0]
  };

  $ctrl.ok = function() {
    $uibModalInstance.close($ctrl.selected.item);
  };

  $ctrl.cancel = function() {
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
  controller: function() {
    var $ctrl = this;

    $ctrl.$onInit = function() {
      $ctrl.items = $ctrl.resolve.items;
      $ctrl.selected = {
        item: $ctrl.items[0]
      };
    };

    $ctrl.ok = function() {
      $ctrl.close({
        $value: $ctrl.selected.item
      });
    };

    $ctrl.cancel = function() {
      $ctrl.dismiss({
        $value: 'cancel'
      });
    };

  }
});
