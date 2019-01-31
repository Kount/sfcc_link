"use strict"

var server = require('server');

// API
var Site = require('dw/system/Site').current;
var BasketMgr = require('dw/order/BasketMgr');
var Logger = require('dw/system/Logger');
var ISML = require('dw/template/ISML');
var OrderMgr = require('dw/order/OrderMgr');
var Transaction = require('dw/system/Transaction');

// Tools
var kount = require('int_kount/cartridge/scripts/kount/LibKount');

/**
 * @description Collect info about user on the billing page.
 * @returns {void | {void error: string}}
 * @constructor
 */
server.use('DataCollector', function (req, res, next) {
    if(kount._isKountEnabled) {
        if(request.httpRemoteAddress) {
            var basket = BasketMgr.getCurrentBasket();

            if(!kount.filterIP(request.httpRemoteAddress)) {
                res.render('kount/iframe', {
                    Basket: basket
                });
                return next();
            } else {
                session.custom.sessId = session.sessionID.substr(0,24).replace('-','_','g') + basket.getUUID().substr(0,8).replace('-','_','g');
            }

        } else {
            kount.writeExecutionError(new Error("KOUNT: K.js: Can't get user IP"), "DataCollector", "error");
            res.json({error: 'Can\'t get user IP'});
            return next();
        }
    } else {
        kount.writeExecutionError(new Error("KOUNT: K.js: Kount is not enabled"), "DataCollector", "info");
        res.json({error: "KOUNT: K.js: Kount is not enabled"});
    }    
});

/**
 * @description Renders "pixel" probe on the billing page
 * @return {void}
 * @constructor
 */
server.use('Image', function(req, res, next) {
	res.render('kount/logo');
	return next();
});

/**
 * @description Renders template with fields to simulate a address verification and card verification
 * @return {void}
 */
server.use('ExampleVerification', function(req, res, next) {
	if (kount._isKountEnabled && kount._isExampleVerificationsEnabled()) {
		res.render('kount/exampleverification');
	} else {
		res.render('kount/emptyTemplate');
	}
	return next();
});

module.exports = server.exports();