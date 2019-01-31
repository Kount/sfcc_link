"use strict"

var server = require('server');

//API
var Site = require('dw/system/Site').current;
var ISML = require('dw/template/ISML');

// Tools
var kount = require('int_kount/cartridge/scripts/kount/LibKount');

// Scripts
var Utils = require('int_kount/cartridge/scripts/kount/KountUtils');
var EventHub = require('int_kount/cartridge/scripts/kount/KountEventHub');

/**
 * @description Handler for the Kount XML Event Notification System (ENS)
 * @returns {void | boolean}
 */
server.use('EventClassifications', function(req, res, next) {
    if(kount._isENSEnabled()) {
        try {
            var result = Utils.parseEnsXMLtoObject(request.httpParameterMap.getRequestBodyAsString());

            result.forEach(function(event) {
                // if event not configured in HUB try to handle request as RISK
            	var EventRunner = EventHub[event.name.toString().toUpperCase()] || EventHub.RISK_CHANGE;
            	if(EventRunner && event.orderNo) { 
            		EventRunner(event, req);
            	}
            })

        } catch (e) {
            kount.writeExecutionError(new Error("KOUNT: K_ENS.js: Error when parsing ENS xml: " + e), "EventClassifications", "error");
        } finally {
            res.render('kount/emptyTemplate');
            return next();
        }
    } else {
    	res.render('kount/emptyTemplate');
    	return next();
    }
});

module.exports = server.exports();