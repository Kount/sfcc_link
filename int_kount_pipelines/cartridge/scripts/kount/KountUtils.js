"use strict"

// API
var dwutil = require('dw/util');

/**
 * @description Parse XML from the EMS system
 * @type {{parseEnsXMLtoObject: module.exports.parseEnsXMLtoObject}}
 */
module.exports = {
	parseEnsXMLtoObject: function(xmlBody) {
		var eventData = {},
		 	xmlObj = new XML(xmlBody),
		 	xmlList = xmlObj.children('event'),
		 	eventDataMap = new dwutil.ArrayList();

		for each( var item in xmlList ){
			var paramName = item.name.toString().split('_');
			eventData = {
				name: item.name.toString(),
				attributeName: paramName[paramName.length-1], // name custom attribute which will be updated
				transactionID: item.key.toString(),
				orderNo: item.key.@order_number.toString() || '',
				site: item.key.@site.toString() || '',
				oldValue: item.old_value.toString(),
				newValue: item.new_value.toString(),
				reasonCode: item.new_value.@reason_code.toString(),
				date: item.occurred.toString()
			};
			eventDataMap.add1(eventData);
		};
		return eventDataMap.toArray();
	},
	extend: function (target, source) {
	    var _source;

	    if (!target) {
	        return source;
	    }

	    for (var i = 1; i < arguments.length; i++) {
	        _source = arguments[i];
	        for (var prop in _source) {
	            // recurse for non-API objects
	            if (_source[prop] && 'object' === typeof _source[prop] && !_source[prop].class) {
	                target[prop] = this.extend(target[prop], _source[prop]);
	            } else {
	                target[prop] = _source[prop];
	            }
	        }
	    }

	    return target;
	}
};