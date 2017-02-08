"use strict"

// API
var dwsvc =  require('dw/svc');

// Tools
var kount = require('~/cartridge/scripts/kount/LibKount');

/**
 * @description creating of the ServiceDefinition object for the service
 */
dwsvc.ServiceRegistry.configure("kount", {
	createRequest: function(svc, args){
		var argsArray = [];

	    for (var key in args) {
	    	argsArray.push(key + "=" + args[key]);
	    }

		svc.setRequestMethod("POST");
		svc.addHeader("Content-Type", "application/x-www-form-urlencoded");

		return argsArray.join("&");
    },
    parseResponse: function(svc, client) {
    	var result = {};

    	try { 
    		result = JSON.parse(client.text);
    	} catch(error) {
    		kount.plainTextHandler(client.text);
    	}

    	return result;
    }
});