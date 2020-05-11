/* eslint-disable no-unused-vars */
/* global PIPELET_NEXT PIPELET_ERROR */

/**
*   @input Basket : Object
*/

// Kount
var Kount = require('int_kount/cartridge/scripts/kount/LibKount');

/**
 * @param {Object} args - pdict of the execution
 * @returns {number} - returns execution result
 */
function execute(args) {
    var call = Kount.preRiskCall(args.Basket, function () {});

    if (call && call.KountOrderStatus === 'DECLINED') {
        return PIPELET_ERROR;
    }

    return PIPELET_NEXT;
}
