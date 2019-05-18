angular.module('angularApp', ['ui.bootstrap'])
  .filter('realNumber', function() {

    return function(input) {

      input = realNumber/10000000000

      return input;
    }

  })
  .controller('indexCtrl', function($scope, $http, $window) {

    function onlyUnique(value, index, self) {
      return self.indexOf(value) === index;
    }

    $scope.token = token;

    $scope.potentialInvestors = function(address) {
      $http.get("/api/captable/" + $scope.token)

      .then(function(response) {

          $scope.data = response.data.investors
          $scope.total_supply = response.data.total_supply
          console.log(response.data);

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

              $scope.issuerAddress = web3.eth.accounts.givenProvider.selectedAddress;
              $scope.potentialInvestors(web3.eth.accounts.givenProvider.selectedAddress);
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

///// ------- METHODS FOR TOOLS ------------/////


    $scope.modifyDates = function () {

      console.log($scope.buy_date_add);

      if($scope.buy_date_add != 0) {
        buy_date = moment($scope.dt).add($scope.buy_date_add, 'M').format("DD-MM-YYYY")
      } else {

        buy_date = moment($scope.dt).format("DD-MM-YYYY")
      }

      if($scope.sell_date_add != 0) {
        sell_date = moment($scope.dt).add($scope.sell_date_add, 'M').format("DD-MM-YYYY")
      } else {

        sell_date = moment($scope.dt).format("DD-MM-YYYY")
      }

      var arrayLength = $scope.data.length;
      for (var i = 0; i < arrayLength; i++) {
        //console.log(myStringArray[i]);

        $scope.data[i].buy_date = buy_date;
        $scope.data[i].sell_date = sell_date;
        $scope.data[i].issuerWalletAddress = $scope.issuerAddress
        //Do something
    }

      console.log($scope.data);

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
   dateDisabled: disabled,
   formatYear: 'yy',
   maxDate: new Date(2020, 5, 22),
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
 $scope.events = [
   {
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
     var dayToCheck = new Date(date).setHours(0,0,0,0);

     for (var i = 0; i < $scope.events.length; i++) {
       var currentDay = new Date($scope.events[i].date).setHours(0,0,0,0);

       if (dayToCheck === currentDay) {
         return $scope.events[i].status;
       }
     }
   }

   return '';
 }
    // Add to whitelist
    $scope.addToWhitelist = function(record) {


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
