/* eslint-disable no-unused-vars */
/* global PIPELET_NEXT PIPELET_ERROR empty */

/**
*   @input Order : Object
*   @output KountOrderStatus : String
*
*/

// Kount
var Kount = require('*/cartridge/scripts/kount/libKount');

/**
 * @param {Object} args - pdict of the execution
 * @returns {number} - returns execution result
 */
function execute(args) {
    var call = Kount.postRiskCall(function () {}, args.Order);

    if (empty(call)) {
        return PIPELET_ERROR;
    }

    // eslint-disable-next-line no-param-reassign
    args.KountOrderStatus = call.KountOrderStatus;
    return PIPELET_NEXT;
}
