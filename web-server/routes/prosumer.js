
/***************************************************************************
 * Defines the RESTful API of routes available for the prosumers.
 ***************************************************************************/


var express = require('express');
var controller = require('../controllers/prosumer');
var auth = require('./middleware/auth');
var validate = require('./middleware/validate');
var router = express.Router();
require('express-validator');


/**
 * Views the /prosumer/signin page
 */
router.get('/signin', function(req, res) {
    res.render('prosumer/signin', {alerts: req.alert()});
});


/**
 * Views the /prosumer/signup page
 */
router.get('/signup', function(req, res) {
    res.render('prosumer/signup', {alerts: req.alert()});
});


/**
 * POST request /prosumer/signin used for prosumer signin.
 */
router.post('/signin', validate.prosumerSignin, controller.loginProsumer);


/**
 * POST request /prosumer/signup for creating a new prosumer account.
 */
router.post('/signup', validate.prosumerSignup, controller.createProsumer);


/**
 * POST request /prosumer/signout for signing out a prosumer account.
 */
router.get('/signout', auth.destroy, function(req, res) {
    res.redirect('./signin');
});


/**
 * GET request /prosumer/dashboard for accessign a prosumers dashboard.
 */
router.get('/dashboard', auth.verify, controller.dashboard);


/**
 * GET request /prosumer/dashboard for overview.
 */
router.get('/overview', function(req, res) {
    res.render('prosumer/overview');
});


module.exports = router;
