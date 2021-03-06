var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');

module.exports = function (app) {
  app.use('/', router);
};

router.get('/', function (req, res, next) {
    res.render('map');
});

router.get('/node', function (req, res, next) {
    res.render('node');
});

router.get('/link', function (req, res, next) {
    res.render('link');
});
