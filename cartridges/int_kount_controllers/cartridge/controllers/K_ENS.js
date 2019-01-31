"use strict"

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
function eventClassifications() {
    if(kount._isENSEnabled()) {
        try {
            var result = Utils.parseEnsXMLtoObject(request.httpParameterMap.getRequestBodyAsString());

            result.forEach(function(event) {
                // if event not configured in HUB try to handle request as RISK
            	var EventRunner = EventHub[event.name.toString().toUpperCase()] || EventHub.RISK_CHANGE;
            	if(EventRunner && event.orderNo) { 
            		EventRunner(event);
            	}
            })

        } catch (e) {
            kount.writeExecutionError(new Error("KOUNT: K_ENS.js: Error when parsing ENS xml"), "EventClassifications", "error");
        } finally {
            ISML.renderTemplate('kount/confirmationENS');
        }
    } else {
    	ISML.renderTemplate('kount/confirmationENS');
    }
}

/** @see module:controllers/K_ENS~EventClassifications */
exports.EventClassifications = eventClassifications;
exports.EventClassifications.public = true;