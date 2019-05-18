var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var indexRouter = require('./routes/index');


var reactViews = require('express-react-views');

var app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
//app.use(express.static('public'));

var engines = require('consolidate');

app.engine('html', engines.ejs);
app.set('view engine', 'html');

app.use('/', indexRouter);

app.get('/', function(req, res){
//   console.log('got here');
   res.render('index.html')
 })

app.get('/employer/', function(req, res){
  //var json = {'token' : req.params.token };
  res.render('index.html')
})

app.get('/payments/', function(req, res){
  //var json = {'token' : req.params.token };
  res.render('payments.html', {data: {id: null}})
})

app.get('/payments/:id', function(req, res){
  var json = {'id' : req.params.id };
  res.render('payments.html', {data:json})
})

app.get('/employee/', function(req, res){
  //var json = {'token' : req.params.token };
  res.render('employee.html')
})

module.exports = app;
