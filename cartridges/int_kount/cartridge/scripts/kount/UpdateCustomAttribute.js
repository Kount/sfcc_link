"use strict"

// Api
var Transaction = require('dw/system/Transaction');

/**
 * @description Update given order by ENS events (<new_value> tag)
 * @param eventData
 * @param attr
 * @param order
 * @returns {{orderStatus: string, originalOrderStatus: string, mailTo: string}}
 */
function update(eventData, attr, order) {
		var kount = require('~/cartridge/scripts/kount/LibKount'),
			orderStatus;

	if (!order) {
		throw kount.writeExecutionError (new Error("KOUNT: UpdateCustomAttribute.js: Order not found"), "Update Orders", "error");
	}
	
	var attrName = !empty(attr) ? attr : eventData['attributeName'],
		attrValue = eventData['newValue'];
	
	if(attrName == "REASON_CODE"){
		attrValue = eventData["reasonCode"];
	}
	
	if(attrName == "Status"){
		var statusMap = { A : 'APPROVED', D : 'DECLINED', R : 'HOLD', E : 'HOLD' },
		attrValue = statusMap[eventData['newValue']];
		orderStatus = 'Status'+attrValue;
	}
	
	try{
		Transaction.wrap(function() {
	 		if ((attrName != "Status" || order.custom.kount_Status == "HOLD") && attrValue) {
				order.custom["kount_"+attrName] = attrValue;
			}
		});
	} catch(e){
		kount.writeExecutionError (new Error("KOUNT: UpdateCustomAttribute.js: kount_" + attrName + " custom field wasn't save"), "Update Orders", "error");
	}

    return {
		orderStatus: orderStatus,
		originalOrderStatus: attr,
		mailTo: kount._getEmailList().join(",")
	}
}

exports.update = update;
