'use strict';

var assert = require('chai').assert;
var proxyquire = require('proxyquire').noCallThru().noPreserveCache();

var urlUtilsMock = {
    staticURL: function (a) {
        return 'test' + a;
    }
};

var emptyFuncMock = function (obj) {
    return !obj;
};

var EncodingMock = {
    toURI: function (data) {
        return data;
    }
};

var reqMock = {
    httpRemoteAddress: '192.168.33.33'
};

function getCollectionMock(items) {
    var arr = items;
    arr.iterator = function () {
        var currentIndex = 0;
        var data = items;
        return {
            hasNext: function () {
                return currentIndex < data.length;
            },
            next: function () {
                return data[currentIndex++];
            }
        };
    };
    return arr;
}

function getMoneyMock(val) {
    return {
        getValue: function () {
            return val;
        }
    };
}

function getGiftCertificateItemMock(price) {
    return {
        getPriceValue: function () { return price; },
        getLineItemText: function () { return 'text'; },
        getBasePrice: function () {
            return getMoneyMock(price);
        },
        getUUID: function () {
            return 'UUID';
        }
    };
}

function getProductItemMock(price, category, qty) {
    return {
        getPriceValue: function () { return price; },
        getLineItemText: function () { return 'text'; },
        getBasePrice: function () {
            return getMoneyMock(price);
        },
        getQuantityValue: function () {
            return qty;
        },
        getProductName: function () {
            return 'product name';
        },
        getCategory: function () {
            return category;
        },
        getProductID: function () {
            return '123';
        }
    };
}

function getCatetegoryMock(name) {
    return {
        getDisplayName: function () {
            return name;
        }
    };
}

function getPayInstrMock(method) {
    return {
        paymentMethod: method,
        getGiftCertificateCode: function () {},
        custom: {
            paypalPayerID: 'paypalPayerID'
        },
        getPaymentMethod: function () {
            return method;
        },
        paymentTransaction: {
            paymentProcessor: {
                ID: 'PAYPAL_PAYMENTSPRO'
            }
        }
    };
}

function getOrderAddressMock() {
    return {
        getAddress1: function () {
            return 'address1';
        },
        getAddress2: function () {
            return 'address2';
        },
        getCity: function () {
            return 'city';
        },
        getFullName: function () {
            return 'full name';
        },
        getPostalCode: function () {
            return 'postalcode';
        },
        getPhone: function () {
            return 'phone';
        },
        getStateCode: function () {
            return 'statecode';
        },
        getCountryCode: function () {
            return {
                getValue: function () {
                    return 'countrycode';
                }
            };
        }
    };
}

function getShipmentMock(method) {
    return {
        getShippingMethod: function () {
            return {
                getDisplayName: function () {
                    return method;
                }
            };
        },
        getShippingAddress: function () {
            return method === 'custom' ? null : getOrderAddressMock();
        }
    };
}

function getOrderMock(paymentInstruments) {
    return {
        getTotalGrossPrice: function () {
            return getMoneyMock(300);
        },
        getCustomer: function () {
            return {
                getProfile: function () {
                    return {
                        creationDate: new Date(),
                        getCustomerNo: function () {
                            return '12345';
                        },
                        getFirstName: function () {
                            return 'first';
                        },
                        getLastName: function () {
                            return 'last';
                        },
                        getSecondName: function () {
                            return '';
                        },
                        getEmail: function () {
                            return 'email@email.com';
                        }
                    };
                }
            };
        },
        getBillingAddress: function () {
            return getOrderAddressMock();
        },
        getPaymentInstruments: function () {
            return paymentInstruments;
        },
        allProductLineItems: getCollectionMock([
            getProductItemMock(300, null, 1),
            getProductItemMock(300, getCatetegoryMock('category name'), 1),
            getProductItemMock(0, null, 1)
        ]),
        getGiftCertificateLineItems: function () {
            return getCollectionMock([
                getGiftCertificateItemMock(100),
                getGiftCertificateItemMock(0)
            ]);
        },
        getShipments: function () {
            return getCollectionMock([
                getShipmentMock('Express'),
                getShipmentMock('custom')
            ]);
        },
        custom: {
            kount_Status: {
                value: 'APPROVED'
            },
            kount_CVVR: 'X',
            kount_AVSZ: 'X',
            kount_AVST: 'X'
        }
    };
}

function getArgMock(orderMock, orderID, paymentType) {
    return {
        CurrentRequest: reqMock,
        Email: 'email@email.com',
        SessionID: 'sessionid',
        OrderID: orderID,
        Order: orderMock,
        CreditCard: {},
        PaymentType: paymentType
    };
}

var libKountMock = {
    getPayment: function (collection) {
        var iterator = null;
        if (collection) {
            iterator = collection.iterator();
        }

        return iterator && iterator.hasNext() ? iterator.next() : null;
    },
    getMerchantID: function () {
        return 'MerchantID';
    },
    writeExecutionError: function () {},
    PostRISRequest: function (data) {
        return data;
    },
    getWebsiteID: function () {
        return 'siteID';
    },
    getUDFFields: function () {
        return '';
    },
    evaluateRISResponse: function () {
        return 'APPROVED';
    }
};

var constantsMock = {
    ALLOWED_PAYMENT_METHODS: ['CARD', 'GIFT'],
    RISK_WORKFLOW_TYPE: 1,
    RISK_WORKFLOW_TYPE_PRE: 1,
    ALLOWED_VERIFICATION_VALUES: []
};

var SiteMock = {
    getCurrent: function () {
        return {
            getDefaultCurrency: function () {
                return 'USD';
            }
        };
    }
};

describe('PostRiskInqueryService', function () {
    var PostRiskInqueryService = null;

    beforeEach(function () {
        PostRiskInqueryService = proxyquire('../../../../../cartridges/int_kount/cartridge/scripts/kount/postRiskInqueryService.js', {
            'dw/web/URLUtils': urlUtilsMock,
            'dw/system/Site': SiteMock,
            'dw/system/System': {},
            'dw/order/Order': {},
            'dw/customer/Customer': {},
            'dw/order/LineItem': {},
            'dw/web/Resource': {
                msg: function () { return 'string'; }
            },
            'dw/crypto/Encoding': EncodingMock,
            '*/cartridge/scripts/kount/kountConstants': constantsMock,
            '*/cartridge/scripts/kount/libKount': libKountMock,
            '*/cartridge/scripts/kount/kHash': {
                hashGiftCard: function (data) {
                    return data;
                }
            }
        });
        PostRiskInqueryService.__proto__.request = reqMock; // eslint-disable-line
        PostRiskInqueryService.__proto__.empty = emptyFuncMock; // eslint-disable-line
        PostRiskInqueryService.__proto__.session = { // eslint-disable-line
            custom: {},
            privacy: {}
        };
    });

    after(function () {
        delete PostRiskInqueryService.__proto__.request; // eslint-disable-line
        delete PostRiskInqueryService.__proto__.empty; // eslint-disable-line
        delete PostRiskInqueryService.__proto__.session; // eslint-disable-line
    });

    it('should export an init function', function () {
        assert.isFunction(PostRiskInqueryService.init);
    });

    it('init function should handle args and return proper response for CREDIT_CARD payment type and gift payment in order', function () {
        var paymentsMock = getCollectionMock([
            getPayInstrMock('GIFT_CERTIFICATE')
        ]);
        var orderMock = getOrderMock(paymentsMock);
        var argsMock = getArgMock(orderMock, '123', 'CREDIT_CARD');
        var result = PostRiskInqueryService.init(argsMock);
        assert.equal(result.KountOrderStatus, 'APPROVED');
        assert.equal(result.responseRIS.AUTH, 'string');
        assert.equal(result.responseRIS.AVST, 'X');
        assert.equal(result.responseRIS.MERC, 'MerchantID');
        assert.equal(result.responseRIS.ORDR, '123');
    });

    it('init function should handle args and return proper response for GIFT_CERTIFICATE payment type', function () {
        var paymentsMock = getCollectionMock([
            getPayInstrMock('GIFT_CERTIFICATE')
        ]);
        var orderMock = getOrderMock(paymentsMock);
        var argsMock = getArgMock(orderMock, '123', 'GIFT_CERTIFICATE');
        var result = PostRiskInqueryService.init(argsMock);
        assert.equal(result.KountOrderStatus, 'APPROVED');
    });

    it('init function should handle args without orderID and return proper response for CREDIT_CARD payment type', function () {
        var paymentsMock = getCollectionMock([
            getPayInstrMock('CREDIT_CARD')
        ]);
        var orderMock = getOrderMock(paymentsMock);
        var argsMock = getArgMock(orderMock, null, 'CREDIT_CARD');
        var result = PostRiskInqueryService.init(argsMock);
        assert.equal(result.KountOrderStatus, 'APPROVED');
        assert.equal(result.responseRIS.PTYP, 'CARD');
        assert.equal(result.responseRIS.AUTH, 'string');
        assert.equal(result.responseRIS.AVST, 'X');
        assert.equal(result.responseRIS.MERC, 'MerchantID');
    });

    it('init function should handle args and return proper response for CREDIT_CARD payment', function () {
        var paymentsMock = getCollectionMock([
            getPayInstrMock('CREDIT_CARD')
        ]);
        var orderMock = getOrderMock(paymentsMock);
        var argsMock = getArgMock(orderMock, '123', 'CREDIT_CARD');
        var result = PostRiskInqueryService.init(argsMock);
        assert.equal(result.KountOrderStatus, 'APPROVED');
        assert.equal(result.responseRIS.AUTH, 'string');
        assert.equal(result.responseRIS.AVST, 'X');
        assert.equal(result.responseRIS.MERC, 'MerchantID');
        assert.equal(result.responseRIS.ORDR, '123');
    });

    it('init function should handle unknown payment type', function () {
        var paymentsMock = getCollectionMock([
            getPayInstrMock('UNKNOWN')
        ]);
        var orderMock = getOrderMock(paymentsMock);
        var argsMock = getArgMock(orderMock, '123', 'UNKNOWN');
        var result = PostRiskInqueryService.init(argsMock);
        assert.equal(result.KountOrderStatus, 'APPROVED');
        assert.isUndefined(result.responseRIS.PTYP);
    });
});
