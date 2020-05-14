/* global empty */

'use strict';

// API
var Transaction = require('dw/system/Transaction');
var Resource = require('dw/web/Resource');

/**
 * @description Updates given order by Risk Call response
 * @param {dw.order.Order} order - SFCC order
 * @param {Object} riskResult - risk result object
 * @param {string} hashedCCNumber - hashed card number
 * @param {string} sessId - session id
 * @returns {boolean|Function} - return status of execution
 */
function init(order, riskResult, hashedCCNumber, sessId) {
    var kount = require('*/cartridge/scripts/kount/libKount');

    if (riskResult.responseRIS && riskResult.responseRIS.MODE === Resource.msg('kount.MODE_UPDATE', 'kount', null)) {
        return true;
    }

    if (!order) {
        kount.writeExecutionError(new Error("KOUNT: UpdateOrder.ds: Order doesn't exist"), 'Update Orders', 'error');
    }

    return Transaction.wrap(function () {
        // eslint-disable-next-line no-param-reassign
        order.custom.kount_Status = riskResult.KountOrderStatus;

        if (order.custom.kount_Status.value !== riskResult.KountOrderStatus) {
            kount.writeExecutionError(new Error("KOUNT: UpdateOrder.ds: kount_Status custom field wasn't save"), 'Update Orders', 'error');
        }

        if (riskResult.KountOrderStatus === 'RETRY') {
            // eslint-disable-next-line no-param-reassign
            order.custom.kount_KHash = hashedCCNumber;
            // eslint-disable-next-line no-param-reassign
            order.custom.kount_SessionId = sessId;
        }

        var response = riskResult.responseRIS;
        if (!empty(response)) {
            try {
                var params = response;
                // eslint-disable-next-line no-prototype-builtins
                if (!params.hasOwnProperty('ERRO')) {
                    var elementList = ['GEOX', 'NETW', 'SCOR', 'VELO', 'VMAX', 'TRAN', 'BROWSER', 'OS', 'IP_ORG', 'CARDS', 'DEVICES', 'COUNTRY', 'EMAILS', 'REASON_CODE', 'REPLY'];
                    for (var i = 0; i < elementList.length; i++) {
                        var elem = elementList[i];
                        if (elem === 'REPLY') {
                            // eslint-disable-next-line no-param-reassign
                            order.custom['kount_' + elem] = params.AUTO;
                            if (order.custom['kount_' + elem] !== params.AUTO) {
                                kount.writeExecutionError(new Error('KOUNT: UpdateOrder.ds: kount_' + elem + " custom field wasn't save"), 'Update Orders', 'error');
                            }
                        } else if (elem in params) {
                            // eslint-disable-next-line no-param-reassign
                            order.custom['kount_' + elem] = params[elem];
                            if (order.custom['kount_' + elem] !== params[elem]) {
                                kount.writeExecutionError(new Error('KOUNT: UpdateOrder.ds: kount_' + elem + " custom field wasn't save"), 'Update Orders', 'error');
                            }
                        }
                    }
                }
            } catch (err) {
                kount.writeExecutionError(err, 'Update Orders', 'error');
            }
        }
        return true;
    });
}

exports.init = init;
