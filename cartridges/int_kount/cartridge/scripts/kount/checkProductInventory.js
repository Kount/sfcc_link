/* global empty */

'use strict';

// API
var ProductInventoryMgr = require('dw/catalog/ProductInventoryMgr');

// Script
var kount = require('*/cartridge/scripts/kount/libKount');

/**
 * @description Check if all items in the order exist in shop inventory list
 * @param {dw.order.Order} order - SFCC order
 * @param {Function} callback - callback function
 */
function check(order, callback) {
    var inventoryList = ProductInventoryMgr.getInventoryList();
    var productItems = order.getAllProductLineItems();
    var iter = productItems.iterator();

    while (!empty(iter) && iter.hasNext()) {
        var product = iter.next().getProduct();

        if (!empty(product)) {
            if (product.variant || product.product || product.bundle) {
                var inventory = inventoryList.getRecord(product.getID());
                if (empty(inventory)) {
                    kount.writeExecutionError(new Error("KOUNT: CheckProductInventory.ds: inventory haven't found"), 'CheckProductInventory.ds', 'error');
                    callback(false);
                }
            }
        }
    }

    callback(true);
}

exports.check = check;
