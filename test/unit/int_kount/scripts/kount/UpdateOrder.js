var assert = require('chai').assert;
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

var ResourceMock = {
    msg: sinon.spy(function () {
        return 'MODE1';
    })
};

var TransactionMock = {
    wrap: function (func) {
        return func();
    }
};

var libKountMock = {
    writeExecutionError: sinon.spy(function () { return 'this is an error'; })
};

function getOrderMock() {
    return {
        custom: {}
    };
}

function getRiskResultMock(status) {
    return {
        KountOrderStatus: status,
        responseRIS: {
            AUTO: 'AUTO',
            MODE: 'MODE',
            REASON_CODE: 'REASON_CODE'
        }
    };
}


describe('UpdateOrder', function () {
    var UpdateOrder = null;
    var orderMock = null;
    var riskResultMock = null;

    beforeEach(function () {
        UpdateOrder = proxyquire('../../../../../cartridges/int_kount/cartridge/scripts/kount/UpdateOrder', {
            'dw/web/URLUtils': urlUtilsMock,
            'dw/system/Transaction': TransactionMock,
            'dw/web/Resource': ResourceMock,
            '*/cartridge/scripts/kount/LibKount': libKountMock
        });
        UpdateOrder.__proto__.empty = emptyFuncMock; // eslint-disable-line
        orderMock = getOrderMock();
        riskResultMock = getRiskResultMock('APPROVED');
    });

    after(function () {
        delete UpdateOrder.__proto__.empty; // eslint-disable-line
    });

    it('should provide a init function', function () {
        assert.isFunction(UpdateOrder.init);
    });

    it('should update an order kount status and other fields and return true', function () {
        var result = UpdateOrder.init(orderMock, riskResultMock);
        assert.equal(result, true);
        assert.equal(orderMock.custom.kount_Status, 'APPROVED');
        assert.equal(orderMock.custom.kount_REPLY, 'AUTO');
        assert.equal(orderMock.custom.kount_REASON_CODE, 'REASON_CODE');
    });

    it('should update an order kount status but not other fields and return true', function () {
        riskResultMock.responseRIS.ERRO = 'ERRO';
        var result = UpdateOrder.init(orderMock, riskResultMock);
        assert.equal(result, true);
        assert.equal(orderMock.custom.kount_Status, 'APPROVED');
        assert.isUndefined(orderMock.custom.kount_REASON_CODE);
    });

    it('should not update order and return true', function () {
        riskResultMock.responseRIS.MODE = 'MODE1';
        var result = UpdateOrder.init(orderMock, riskResultMock);
        assert.equal(result, true);
        assert.isUndefined(orderMock.custom.kount_Status);
        assert.isUndefined(orderMock.custom.kount_REASON_CODE);
    });

    it('should save kount_KHash and kount_SessionId for kount retry status', function () {
        var result = UpdateOrder.init(orderMock, getRiskResultMock('RETRY'), 'hashedCCNumber', 'sessId');
        assert.equal(result, true);
        assert.equal(orderMock.custom.kount_Status, 'RETRY');
        assert.equal(orderMock.custom.kount_KHash, 'hashedCCNumber');
        assert.equal(orderMock.custom.kount_SessionId, 'sessId');
    });
});
