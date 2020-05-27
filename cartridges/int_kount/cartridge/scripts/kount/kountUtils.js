/* global XML */
'use strict';

// API
var dwutil = require('dw/util');

/**
 * @description Parse XML from the EMS system
 * @type {{parseEnsXMLtoObject: module.exports.parseEnsXMLtoObject}}
 */
module.exports = {
    parseEnsXMLtoObject: function (xmlBody) {
        var eventData = {};
        var xmlObj = new XML(xmlBody);
        var xmlList = xmlObj.children('event');
        var eventDataMap = new dwutil.ArrayList();

        for (var i = 0; i < xmlList.length(); i++) {
            var itemXML = xmlList[i];
            var paramName = itemXML.name.toString().split('_');
            eventData = {
                name: itemXML.name.toString(),
                attributeName: paramName[paramName.length - 1], // name custom attribute which will be updated
                transactionID: itemXML.key.toString(),
                orderNo: itemXML.key['@order_number'].toString() || '',
                site: itemXML.key['@site'].toString() || '',
                oldValue: itemXML.old_value.toString(),
                newValue: itemXML.new_value.toString(),
                reasonCode: itemXML.new_value['@reason_code'].toString(),
                date: itemXML.occurred.toString()
            };
            eventDataMap.add1(eventData);
        }
        return eventDataMap.toArray();
    },
    extend: function (target, source) {
        var curSource;

        if (!target) {
            return source;
        }

        for (var i = 1; i < arguments.length; i++) {
            curSource = arguments[i];
            // eslint-disable-next-line no-restricted-syntax
            for (var prop in curSource) {
                // recurse for non-API objects
                if (curSource[prop] && typeof curSource[prop] === 'object' && !curSource[prop].class) {
                    // eslint-disable-next-line no-param-reassign
                    target[prop] = this.extend(target[prop], curSource[prop]);
                } else {
                    // eslint-disable-next-line no-param-reassign
                    target[prop] = curSource[prop];
                }
            }
        }

        return target;
    }
};
