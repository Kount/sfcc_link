'use strict';

var assert = require('chai').assert;
var proxyquire = require('proxyquire').noCallThru().noPreserveCache();
var sinon = require('sinon');

var emptyFuncMock = function (obj) {
    return !obj;
};

var ProductInventoryMgrMock = {
    getInventoryList: function () {
        return {
            getRecord: function (id) {
                return (id === '1') ? 1 : 0;
            }
        };
    }
};

var kountMock = {
    writeExecutionError: function () { }
};

var outOfStockProductMock = {
    variant: false,
    bundle: true,
    getID: function () {
        return '0';
    }
};

var inStockProductMock = {
    variant: true,
    getID: function () {
        return '1';
    }
};

function getPliMock(instock) {
    return {
        getProduct: function () {
            return instock ? inStockProductMock : outOfStockProductMock;
        }
    };
}

function getOrderMock(plisMock) {
    return {
        getAllProductLineItems: function () {
            var currentIndex = 0;
            return {
                iterator: function () {
                    var data = plisMock;
                    return {
                        hasNext: function () {
                            return currentIndex < data.length;
                        },
                        next: function () {
                            return data[currentIndex++];
                        }
                    };
                }
            };
        }
    };
}

describe('CheckProductInventory', function () {
    var CheckProductInventory = null;
    var callback = sinon.spy();

    before(function () {
        CheckProductInventory = proxyquire('../../../../../cartridges/int_kount/cartridge/scripts/kount/checkProductInventory', {
            'dw/catalog/ProductInventoryMgr': ProductInventoryMgrMock,
            '*/cartridge/scripts/kount/libKount': kountMock
        });
        CheckProductInventory.__proto__.empty = emptyFuncMock; // eslint-disable-line
    });

    afterEach(function () {
        callback.reset();
    });

    after(function () {
        delete CheckProductInventory.__proto__.empty; // eslint-disable-line
    });

    it('should export an check function', function () {
        assert.isFunction(CheckProductInventory.check);
    });

    it('in stock product item - callback should be called once', function () {
        var inStockPli = getPliMock(true);
        var orderMock = getOrderMock([inStockPli]);
        CheckProductInventory.check(orderMock, callback);
        assert.isTrue(callback.calledOnce);
        assert.isTrue(callback.withArgs(true).calledOnce);
    });

    it('out stock product item - callback should be called with false args', function () {
        var outOfStockPli = getPliMock(false);
        var orderMock = getOrderMock([outOfStockPli]);
        CheckProductInventory.check(orderMock, callback);
        assert.isTrue(callback.withArgs(false).called);
    });
});
