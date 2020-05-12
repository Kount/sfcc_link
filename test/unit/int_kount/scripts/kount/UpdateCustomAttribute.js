'use strict';

var assert = require('chai').assert;
var expect = require('chai').expect;
var sinon = require('sinon');
var proxyquire = require('proxyquire').noCallThru().noPreserveCache();

var urlUtilsMock = {
    staticURL: function (a) {
        return 'test' + a;
    }
};

var emptyFuncMock = function (obj) {
    return !obj;
};

var TransactionMock = {
    wrap: function (func) {
        return func();
    }
};

var libKountMock = {
    writeExecutionError: sinon.spy(function () { return 'this is an error'; }),
    getEmailList: sinon.spy(function () { return ['email@email.com']; })
};

var orderMock = {
    custom: {
        value: 'HOLD',
        get kount_Status() {
            return { value: this.value };
        },
        set kount_Status(val) {
            this.value = val;
        }
    }
};

var eventDataMock = {
    attributeName: 'Custom',
    newValue: 'A',
    reasonCode: '33'
};

describe('UpdateCustomAttribute', function () {
    var UpdateCustomAttribute = null;

    beforeEach(function () {
        UpdateCustomAttribute = proxyquire('../../../../../cartridges/int_kount/cartridge/scripts/kount/UpdateCustomAttribute', {
            'dw/web/URLUtils': urlUtilsMock,
            'dw/system/Transaction': TransactionMock,
            '*/cartridge/scripts/kount/LibKount': libKountMock
        });
        orderMock.custom.kount_Status = 'HOLD';
        eventDataMock.newValue = 'A';
        UpdateCustomAttribute.__proto__.empty = emptyFuncMock; // eslint-disable-line
        libKountMock.writeExecutionError.reset();
        libKountMock.getEmailList.reset();
    });

    after(function () {
        delete UpdateCustomAttribute.__proto__.empty; // eslint-disable-line
    });

    it('should provide a update function', function () {
        assert.isFunction(UpdateCustomAttribute.update);
    });

    it('should throw an error in case of no order was specified', function () {
        expect(function () {
            UpdateCustomAttribute.update(null, null, null);
        }).to.throw('this is an error');
        assert.isTrue(libKountMock.writeExecutionError.calledOnce);
    });

    it('should update order status to APPROVED and call getEmailList function', function () {
        var result = UpdateCustomAttribute.update(eventDataMock, 'Status', orderMock);
        assert.equal(result.orderStatus, 'StatusAPPROVED');
        assert.equal(orderMock.custom.kount_Status.value, 'APPROVED');
        assert.isTrue(libKountMock.getEmailList.calledOnce);
        assert.equal(result.mailTo, 'email@email.com');
    });

    it('should update order status to DECLINED', function () {
        eventDataMock.newValue = 'D';
        var result = UpdateCustomAttribute.update(eventDataMock, 'Status', orderMock);
        assert.equal(result.orderStatus, 'StatusDECLINED');
        assert.equal(orderMock.custom.kount_Status.value, 'DECLINED');
    });

    it('should not update order status in case of current kount status is not HOLD', function () {
        orderMock.custom.kount_Status = 'DECLINED';
        var result = UpdateCustomAttribute.update(eventDataMock, 'Status', orderMock);
        assert.equal(result.orderStatus, 'StatusAPPROVED');
        assert.equal(orderMock.custom.kount_Status.value, 'DECLINED');
    });

    it('should update order attribute provided in event data in attr is not provided', function () {
        var result = UpdateCustomAttribute.update(eventDataMock, null, orderMock);
        assert.equal(result.originalOrderStatus, null);
        assert.equal(orderMock.custom.kount_Custom, 'A');
    });

    it('should update order kount_REASON_CODE and call getEmailList function', function () {
        var result = UpdateCustomAttribute.update(eventDataMock, 'REASON_CODE', orderMock);
        assert.equal(orderMock.custom.kount_REASON_CODE, '33');
        assert.isTrue(libKountMock.getEmailList.calledOnce);
        assert.equal(result.mailTo, 'email@email.com');
    });

    it('should handle an error in case of wrong attr name was specified', function () {
        orderMock.custom = null;
        UpdateCustomAttribute.update(eventDataMock, 'Status', orderMock);
        assert.isTrue(libKountMock.writeExecutionError.calledOnce);
    });
});
