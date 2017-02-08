"use strict"

// API
var Order = require('dw/order/Order');
var OrderMgr = require('dw/order/OrderMgr');
var Transaction = require('dw/system/Transaction');

// Script
var kount = require('./LibKount');

const statusMap = { A : 'APPROVED', D : 'DECLINED', R : 'HOLD', E : 'HOLD' };

/**
 * @description Updates order export status (status coming from the API call)
 * @param KountOrderStatus {String}
 * @param order
 */
function update(KountOrderStatus, order) {
    var status = statusMap[KountOrderStatus];
    
    // Special case if Kount order status is HOLD
    Transaction.wrap(function () {
    	if(!empty( status ) && status == 'APPROVED' && order.getExportStatus().getDisplayValue() != 'EXPORTED' ) {
    	       order.setExportStatus(Order.EXPORT_STATUS_READY);
    	       order.setConfirmationStatus(Order.CONFIRMATION_STATUS_CONFIRMED);
    	       order.setPaymentStatus(Order.PAYMENT_STATUS_PAID);
    	       try {
    	    	   OrderMgr.placeOrder(order);
    	       } catch (e) {
    	    	   kount.writeExecutionError(new Error("KOUNT: UpdateOrderStatus.js: EventHub: Order with number - "+orderNo+" already placed"), "KountEventHub", "error");
    	       }
    	   } else if( !empty( status ) && ( status == 'DECLINED' || status == 'HOLD' ) ) {
    	       order.setExportStatus(Order.EXPORT_STATUS_NOTEXPORTED);
    	       order.setConfirmationStatus(Order.CONFIRMATION_STATUS_NOTCONFIRMED);
    	}	
    })
}

exports.update = update;