
/***************************************************************************
 * Defines the RESTful API of routes available for the prosumers.
 ***************************************************************************/


var express = require('express');
var auth = require('./middleware/auth');
var validate = require('./middleware/validate');
var upload = require('./middleware/upload');
var prosumerController = require('../controllers/prosumer-controller');
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
router.post('/signin', validate.prosumerSignin, prosumerController.signin);


/**
 * POST request /prosumer/signup for creating a new prosumer account.
 */
router.post('/signup', validate.prosumerSignup, prosumerController.signup);


/**
 * POST request /prosumer/signout for signing out a prosumer account.
 */
router.get('/signout', auth.destroy, function(req, res) {
    res.redirect('./signin');
});


/**
 * GET request /prosumer/dashboard for accessign a prosumers dashboard.
 * Requires authentication in order to access.
 */
router.get('/', auth.verify, prosumerController.dashboard);


/**
 * GET request /prosumer/settings/:page for accessing a prosumers settings.
 * There are multiple pages containing settings provide a page as parameter.
 * Requires authentication in order to access.
 */
router.get('/settings/:page', auth.verify, prosumerController.settings);


/**
 * GET request /prosumer/settings for accessing a prosumers settings.
 * Simply redirects to the first available settings page.
 */
router.get('/settings', auth.verify, prosumerController.settings); 


/**
 * POST request /prosumer/settings/update/profile for updating the
 * prosumers profile settings.
 */
router.post('/settings/update/profile',
            [auth.verify, validate.prosumerUpdateProfile],
            prosumerController.updateProfile);


/**
 * POST request /prosumer/settings/update/avatar for uploading an
 * avatar image.
 */
router.post('/settings/update/avatar',
            [auth.verify, upload.image('avatar')],
            prosumerController.updateAvatar);


/**
 * POST request /prosumer/settings/revert/gravatar for reverting the
 * avatar image to instead use the gravatar image.
 */
router.post('/settings/revert/gravatar', auth.verify, prosumerController.revertToGravatar);


/**
 * POST request /prosumer/settings/upload/house for uploading a picture
 * of the prosumers house, these are stored in a private folder and can
 * only be viewed by the authenticated user.
 */
router.post('/settings/upload/house',
            [auth.verify, upload.image('house', limit=1000000, pub=false)],
            prosumerController.uploadHouse);


/**
 * POST request /prosumer/settings/remove/house for removing an image of the
 * prosumers house.
 */
router.post('/settings/remove/house', auth.verify, prosumerController.removeHouse);


/**
 * POST request /prosumer/settings/delete/account for deleting a prosumer account.
 */
router.post('/settings/delete/account',
            [auth.verify, validate.prosumerDeleteAccount],
            prosumerController.deleteAccount);


/**
 * POST request /prosumer/settings/update/password for updating the
 * prosumers password.
 */
router.post('/settings/update/password',
            [auth.verify, validate.prosumerUpdatePassword],
            prosumerController.updatePassword);


/**
 * GET request /prosumer/overview for overview.
 */
router.get('/overview', auth.verify, prosumerController.overview);


module.exports = router;
