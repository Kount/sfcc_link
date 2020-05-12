'use strict';

var assert = require('chai').assert;
var sinon = require('sinon');
var proxyquire = require('proxyquire').noCallThru().noPreserveCache();

var superModuleMock = {};

var TransactionMock = {
    wrap: function (func) {
        return func();
    }
};

var PaymentProcessorMock = {
    ID: 'ID'
};

var PaymentMgrMock = {
    getPaymentMethod: function () {
        return { getPaymentProcessor: function () { return PaymentProcessorMock; } };
    }
};

var HookMgrMock = {
    callHook: sinon.stub()
};

var KHashMock = {
    hashPaymentToken: function () {
        return 'hashPaymentTokenValue';
    }
};

var paymentInstrumentMock = {
    custom: {},
    setCreditCardHolder: sinon.spy(),
    setCreditCardNumber: sinon.spy(),
    setCreditCardType: sinon.spy(),
    setCreditCardExpirationMonth: sinon.spy(),
    setCreditCardExpirationYear: sinon.spy(),
    setCreditCardToken: sinon.spy()
};

var basketMock = {
    billingAddress: {
        fullName: 'fullName'
    }
};

var billingDataMock = {
    paymentInformation: {
        cardNumber: { value: 'cardNumber' },
        cardType: { value: 'cardType' },
        expirationMonth: { value: 'expirationMonth' },
        expirationYear: { value: 'expirationYear' }
    }
};

var customerMock = {
    getProfile: function () {
        return {
            getWallet: function () {
                return {
                    createPaymentInstrument: function () {
                        return paymentInstrumentMock;
                    }
                };
            }
        };
    }
};

describe('EmailHelper', function () {
    var checkoutHelpers = null;

    before(function () {
        module.__proto__.superModule = superModuleMock; // eslint-disable-line
        checkoutHelpers = proxyquire('../../../../../cartridges/int_kount_sfra/cartridge/scripts/checkout/checkoutHelpers', {
            'dw/system/HookMgr': HookMgrMock,
            'dw/order/PaymentInstrument': {},
            'dw/order/PaymentMgr': PaymentMgrMock,
            'dw/system/Transaction': TransactionMock,
            'int_kount/cartridge/scripts/kount/KHash': KHashMock
        });
    });

    beforeEach(function () {
        paymentInstrumentMock.setCreditCardExpirationMonth.reset();
        paymentInstrumentMock.setCreditCardExpirationYear.reset();
        paymentInstrumentMock.setCreditCardHolder.reset();
        paymentInstrumentMock.setCreditCardNumber.reset();
        paymentInstrumentMock.setCreditCardToken.reset();
        paymentInstrumentMock.setCreditCardType.reset();
    });

    after(function () {
        delete module.__proto__.superModule; // eslint-disable-line
    });

    it('should provide a savePaymentInstrumentToWallet function', function () {
        assert.isFunction(checkoutHelpers.savePaymentInstrumentToWallet);
    });

    it('savePaymentInstrumentToWallet function should return saved credit card info including kount_KHash', function () {
        var result = checkoutHelpers.savePaymentInstrumentToWallet(billingDataMock, basketMock, customerMock);
        assert.equal(result.custom.kount_KHash, 'hashPaymentTokenValue');
        assert.isTrue(paymentInstrumentMock.setCreditCardExpirationMonth.calledOnce);
        assert.isTrue(paymentInstrumentMock.setCreditCardExpirationYear.calledOnce);
        assert.isTrue(paymentInstrumentMock.setCreditCardHolder.calledOnce);
        assert.isTrue(paymentInstrumentMock.setCreditCardNumber.calledOnce);
        assert.isTrue(paymentInstrumentMock.setCreditCardType.calledOnce);
        assert.equal(paymentInstrumentMock.setCreditCardExpirationMonth.args[0][0], 'expirationMonth');
        assert.equal(paymentInstrumentMock.setCreditCardExpirationYear.args[0][0], 'expirationYear');
        assert.equal(paymentInstrumentMock.setCreditCardNumber.args[0][0], 'cardNumber');
        assert.equal(paymentInstrumentMock.setCreditCardType.args[0][0], 'cardType');
    });
});
