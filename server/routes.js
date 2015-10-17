var express = require('express');
var router = express.Router();

var mongoose = require('mongoose');

var User = require('/features/users/userModel');





































































/*

  module.exports = function (req, res, next){
  
  var route = req.url.substring(1).split('/')[0];

    if req type = get, post, etc.
      redirect to handler.js handler[route]
        handler.js:
        users: {
          get: function()
        }



  }



  var handler = require('./handler');

module.exports = function (req, res, next){
  // res.set(defaultCorsHeaders);
  var route = req.url.substring(1).split('/')[0];

  //if not valid, send back redirect
  // if(!isValidRoute(route)){
  //  res.redirect('/');
  // }
  switch(req.method){
    case 'GET':
      handler[route].get(req, res, next);
      break;
    case 'POST':
      handler[route].post(req, res, next);
      break;
    //USE POST METHOD FOR PUT?
    case 'PUT':
      handler[route].post(req, res, next);
      break;
    case 'OPTIONS':
      res.send('okay to continue!');
      break;
    //if anything else, redirect to 
    default:
      console.log('nooooo');
      res.redirect('/');
  }
};

//not sure if we need all these cors headings
var defaultCorsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, PUT, DELETE, OPTIONS",
  "access-control-allow-headers": "content-type, accept",
  "access-control-max-age": 10,
};

  

*/
