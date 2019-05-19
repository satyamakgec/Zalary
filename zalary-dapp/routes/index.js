var express = require('express');
var router = express.Router();

var employees = require('../controllers/employees');
var payments = require('../controllers/payments');

// Payments Calls
router.get('/api/payments/', function(req, res, next) {
  var data = payments.index(req, res, next);
})

router.get('/api/payments/:id', function(req, res, next) {
  var data = payments.index(req, res, next);
})

router.get('/api/payments-fund/', function(req, res, next) {
  var data = payments.fund(req, res, next);
})



// Employees  Calls
router.get('/api/employees/', function(req, res, next) {
  var data = employees.index(req, res, next);
})

router.get('/api/make-employer/', function(req, res, next) {
  var data = employees.makeEmployer(req, res, next);
})

router.get('/api/employees/:id', function(req, res, next) {
  var data = employees.index(req, res, next);
})

router.delete('/api/employees/:id', function(req, res, next) {
  var data = employees.del(req, res, next);
})

router.post('/api/employees/', function(req, res, next) {
  var data = employees.add(req, res, next);
})

module.exports = router;
