"use strict"

// API
var Transaction = require('dw/system/Transaction');
var Resource = require('dw/web/Resource');

/**
 * @description Updates given order by Risk Call response
 * @param order
 * @param riskResult
 * @returns {Boolean|Function}
 */
function init(order, riskResult) {
	var kount = require('~/cartridge/scripts/kount/LibKount');

	if(riskResult.responseRIS.MODE == Resource.msg('kount.MODE_UPDATE','kount',null)) {
		return true;
	}

	if (!order) {
		kount.writeExecutionError(new Error("KOUNT: UpdateOrder.ds: Order doesn't exist"), "Update Orders", "error");
	}

	return Transaction.wrap(function () {
		order.custom["kount_Status"] = riskResult.KountOrderStatus;

		if (order.custom["kount_Status"] != riskResult.KountOrderStatus) {
			kount.writeExecutionError(new Error("KOUNT: UpdateOrder.ds: kount_Status custom field wasn't save"), "Update Orders", "error");
		}

		var response = riskResult.responseRIS;
		if (!empty(response)) {
			try {
				var params = response;
				if (!params.hasOwnProperty('ERRO')) {
					var elementList:Array = ['GEOX', 'NETW', 'SCOR', 'VELO', 'VMAX', 'TRAN', 'BROWSER', 'OS', 'IP_ORG', 'CARDS', 'DEVICES', 'COUNTRY', 'EMAILS', 'REASON_CODE', 'REPLY'];
					for (var i = 0; i < elementList.length; i++) {
						var elem:String = elementList[i];
						if (elem == "REPLY") {
							order.custom['kount_' + elem] = params['AUTO'];
							if (order.custom['kount_' + elem] != params['AUTO']) {
								kount.writeExecutionError(new Error("KOUNT: UpdateOrder.ds: kount_" + elem + " custom field wasn't save"), "Update Orders", "error");
							}
						} else if (elem in params) {
							order.custom['kount_' + elem] = params[elem];
							if (order.custom['kount_' + elem] != params[elem]) {
								kount.writeExecutionError(new Error("KOUNT: UpdateOrder.ds: kount_" + elem + " custom field wasn't save"), "Update Orders", "error");
							}
						}
					}
				}
			} catch (err) {
				kount.writeExecutionError(err, "Update Orders", "error");
			}
		}
		return true;
	})
}

exports.init = init;