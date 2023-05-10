/* global request session */

'use strict';

var server = require('server');

// API
var BasketMgr = require('dw/order/BasketMgr');

// Tools
var kount = require('*/cartridge/scripts/kount/libKount');

/**
 * @description Collect info about user on the billing page.
 * @returns {void | {void error: string}}
 * @constructor
 */
server.use('DataCollector', function (req, res, next) {
    if (kount.isKountEnabled()) {
        if (request.httpRemoteAddress) {
            var basket = BasketMgr.getCurrentBasket();

            if (!kount.filterIP(request.httpRemoteAddress)) {
                res.render('kount/dataCollector', {
                    Basket: basket
                });
                return next();
            }
            session.privacy.sessId = session.sessionID.substr(0, 24).replace('-', '_', 'g') + basket.getUUID().substr(0, 8).replace('-', '_', 'g');
        } else {
            kount.writeExecutionError(new Error("KOUNT: K.js: Can't get user IP"), 'DataCollector', 'error');
            res.render('kount/emptyTemplate');
        }
    } else {
        kount.writeExecutionError(new Error('KOUNT: K.js: Kount is not enabled'), 'DataCollector', 'info');
        res.render('kount/emptyTemplate');
    }
    return next();
});

/**
 * @description Renders "pixel" probe on the billing page
 * @return {void}
 * @constructor
 */
server.use('Image', function (req, res, next) {
    res.render('kount/logo');
    return next();
});

/**
 * @description Renders template with fields to simulate a address verification and card verification
 * @return {void}
 */
server.use('ExampleVerification', function (req, res, next) {
    if (kount.isKountEnabled() && kount.isExampleVerificationsEnabled()) {
        res.render('kount/exampleVerification');
    } else {
        res.render('kount/emptyTemplate');
    }
    return next();
});

module.exports = server.exports();
