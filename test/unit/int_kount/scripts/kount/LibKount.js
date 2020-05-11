'use strict';

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

var constantsMock = {
    RISK_WORKFLOW_TYPE: 1,
    RISK_WORKFLOW_TYPE_PRE: 1,
    RIS_TEST_URL: 'RIS_TEST_URL',
    RIS_PRODUCTION_URL: 'RIS_PRODUCTION_URL',
    DC_TEST_URL: 'DC_TEST_URL',
    DC_PRODUCTION_URL: 'DC_PRODUCTION_URL',
    CORE_SCRIPTS_PATH: 'app_core'
};

var siteMock = {
    getCurrent: function () {
        return siteMock;
    },
    getName: function () { return 'siteName'; },
    getCustomPreferenceValue: function (attr) {
        switch (attr) {
            case 'kount_MODE':
                return {
                    value: 'Test'
                };
            case 'kount_AUTH_TYPE':
                return 'kount_AUTH_TYPE_value';
            case 'kount_IPFilter':
                return 'kount_IPFilter_value';
            case 'kount_HashSaltKey':
                return 'kount_HashSaltKey_value';
            case 'kount_NotificationEmail':
                return ['kount_NotificationEmail_value'];
            case 'kount_APIKey':
                return 'kount_APIKey_value';
            case 'kount_IsEnabled':
                return true;
            case 'kount_WebsiteId':
                return 'kount_WebsiteId_value';
            case 'kount_MerchantID':
                return 'kount_MerchantID_value';
            case 'kount_ENS':
                return true;
            case 'kount_EmailList':
                return 'kount_EmailList_value';
            case 'kount_ExampleVerificationsEnabled':
                return true;
            case 'kount_UDF':
                return ['udflabel|ss.udfattr.ss'];
            case 'kount_IP_RANGE':
                return '192.168.0.0,10.0.0.0';
            default:
                return 'string';
        }
    }
};

var ResourceMock = {
    msg: sinon.spy(function () {
        return 'value from props';
    }),
    msgf: sinon.spy(function () {
        return 'value from props';
    })
};

var kountServiceMock = {
    setURL: sinon.spy(),
    addHeader: sinon.spy(),
    call: function (body) {
        return {
            ok: true,
            object: body
        };
    }
};

var logErrorFunction = sinon.spy();
var logWarnFunction = sinon.spy();
var logInfoFunction = sinon.spy();

var LoggerMock = {
    getLogger: function () {
        return {
            error: logErrorFunction,
            warn: logWarnFunction,
            info: logInfoFunction
        };
    }
};

var templateObjMock = {
    render: sinon.spy()
};

var TemplateMock = function () {
    return templateObjMock;
};

var HashMapMock = function () {
    return {
        put: function () {},
        get: function () {
            return {
                meta: {
                    getSystemAttributeDefinition: function () {
                        return {
                            valueTypeCode: 1,
                            multiValueType: false,
                            system: true
                        };
                    }
                },
                object: {
                    udfattr: 'udfvalue'
                }
            };
        }
    };
};

var mailObjMock = {
    send: sinon.spy(),
    addTo: sinon.spy(),
    setFrom: sinon.spy(),
    setSubject: sinon.spy(),
    setContent: sinon.spy()
};

var MailMock = function () {
    return mailObjMock;
};

var StringUtilsMock = {
    trim: function (val) {
        return val;
    }
};

var orderMock = {
    getDefaultShipment: function () {
        return {
            getShippingAddress: function () {
                return {
                    describe: function () {}
                };
            }
        };
    },
    getBillingAddress: function () {
        return {
            describe: function () {}
        };
    },
    getCustomer: function () {
        return {
            getProfile: function () {
                return {
                    describe: function () {}
                };
            }
        };
    },
    describe: function () {},
    custom: {
        kount_KHash: '1234567890'
    },
    customerEmail: 'customerEmail@mail.com'
};

var sessionMock = {
    custom: {
        isSFRA: 'true',
        sessId: 'sessId'
    },
    forms: {
        billing: {
            creditCardFields: {
                cardNumber: {
                    value: '4111111111111111'
                }
            },
            paymentMethod: {
                value: 'CREDIT_CARD'
            }
        }
    },
    customer: {
        authenticated: true,
        profile: {
            wallet: {
                paymentInstruments: []
            }
        }
    }
};

var KHashMock = {
    hashPaymentToken: function (data) {
        return data;
    }
};

var PostRiskInqueryServiceMock = {
    init: function (data) {
        data.KountOrderStatus = 'DECLINED'; // eslint-disable-line
        return data;
    }
};

var UpdateOrderMock = {
    init: function (order, data) {
        return data;
    }
};

var requestMock = {
    httpParameterMap: {
        kountTestAVST: null,
        kountTestAVSZ: null,
        kountTestCVVR: null
    }
};

var BasketClassMock = {};

var OrderMgrMock = {
    failOrder: sinon.stub(),
    getOrder: function () {
        return orderMock;
    }
};

var TransactionMock = {
    wrap: function (func) {
        return func();
    }
};

var KountUtilsMock = {
    extend: function () {
        return {
            KountOrderStatus: 'DECLINED'
        };
    },
    parseEnsXMLtoObject: function (data) {
        return data;
    }
};

function getPaymentsMock(paymentsMock) {
    var arr = paymentsMock;
    arr.iterator = function () {
        var currentIndex = 0;
        var data = paymentsMock;
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

var ipaddrMock = {
    parse: function (ip) {
        return ip;
    },
    parseCIDR: function (data) {
        return data;
    }
};


var CustomObjectMgrMock = {
    createCustomObject: sinon.spy(function () {
        return { custom: {} };
    })
};

describe('LibKount', function () {
    var LibKount = null;

    beforeEach(function () {
        LibKount = proxyquire('../../../../../cartridges/int_kount/cartridge/scripts/kount/LibKount.ds', {
            'dw/web/URLUtils': urlUtilsMock,
            'dw/svc/ServiceRegistry': {},
            'dw/system/Logger': LoggerMock,
            'dw/system/Site': {
                current: siteMock
            },
            'dw/util/Template': TemplateMock,
            'dw/util/HashMap': HashMapMock,
            'dw/net/Mail': MailMock,
            'dw/object/ObjectAttributeDefinition': {},
            'dw/web/Resource': ResourceMock,
            'dw/util/StringUtils': StringUtilsMock,
            'dw/order/OrderMgr': OrderMgrMock,
            'dw/order/Basket': BasketClassMock,
            'dw/system/Transaction': TransactionMock,
            'dw/object/CustomObjectMgr': CustomObjectMgrMock,
            './KountConstants': constantsMock,
            '~/cartridge/scripts/kount/PostRiskInqueryService': PostRiskInqueryServiceMock,
            '~/cartridge/scripts/kount/UpdateOrder': UpdateOrderMock,
            '~/cartridge/scripts/kount/KountUtils': KountUtilsMock,
            '~/cartridge/scripts/init/initKount': kountServiceMock,
            '~/cartridge/scripts/kount/KHash': KHashMock,
            '~/cartridge/scripts/kount/KountConstants': constantsMock,
            '~/cartridge/scripts/kount/ipaddr': ipaddrMock,
            'app_core/cartridge/scripts/testScriptName': {
                test: 'test'
            },
            'dw/util/UUIDUtils': {
                createUUID: function () { return 'UUID'; }
            }
        });
        LibKount.__proto__.empty = emptyFuncMock; // eslint-disable-line
        LibKount.__proto__.session = sessionMock // eslint-disable-line
        LibKount.__proto__.request = requestMock // eslint-disable-line
        ResourceMock.msg.reset();
        ResourceMock.msgf.reset();
        kountServiceMock.setURL.reset();
        kountServiceMock.addHeader.reset();
        logErrorFunction.reset();
        logWarnFunction.reset();
        templateObjMock.render.reset();
        mailObjMock.send.reset();
        mailObjMock.addTo.reset();
        mailObjMock.setFrom.reset();
        mailObjMock.setSubject.reset();
        mailObjMock.setContent.reset();
        OrderMgrMock.failOrder.reset();
        CustomObjectMgrMock.createCustomObject.reset();
    });

    after(function () {
        delete LibKount.__proto__.empty; // eslint-disable-line
        delete LibKount.__proto__.session; // eslint-disable-line
        delete LibKount.__proto__.request; // eslint-disable-line
    });

    describe('Site Preferences and helpers functions', function () {
        it('isKountEnabled function should return value based on site prefs', function () {
            var result = LibKount.isKountEnabled();
            assert.equal(result, true);
        });

        it('getDCUrl function should return value based on site prefs', function () {
            var result = LibKount.getDCUrl();
            assert.equal(result, constantsMock.DC_TEST_URL);
        });

        it('getWebsiteID function should return value based on site prefs', function () {
            var result = LibKount.getWebsiteID();
            assert.equal(result, 'kount_WebsiteId_value');
        });

        it('getMerchantID function should return value based on site prefs', function () {
            var result = LibKount.getMerchantID();
            assert.equal(result, 'kount_MerchantID_value');
        });

        it('isENSEnabled function should return value based on site prefs', function () {
            var result = LibKount.isENSEnabled();
            assert.equal(result, true);
        });

        it('getEmailList function should return value based on site prefs', function () {
            var result = LibKount.getEmailList();
            assert.equal(result, 'kount_EmailList_value');
        });

        it('isExampleVerificationsEnabled function should return value based on site prefs', function () {
            var result = LibKount.isExampleVerificationsEnabled();
            assert.equal(result, true);
        });

        it('isSFRA function should return true', function () {
            var result = LibKount.isSFRA();
            assert.equal(result, true);
        });

        it('getNotificationEmail function should return value from properties', function () {
            var result = LibKount.getNotificationEmail();
            assert.equal(result, 'value from props');
            assert.isTrue(ResourceMock.msg.calledOnce);
        });

        it('getCoreScript function should return proper file path', function () {
            var result = LibKount.getCoreScript('testScriptName');
            assert.equal(result.test, 'test');
        });

        it('filterIP function should return true for whitelisted values', function () {
            var result = LibKount.filterIP('kount_IPFilter_value');
            assert.equal(result, true);
        });

        it('filterIP function should return false for not whitelisted values', function () {
            var result = LibKount.filterIP('NOPE');
            assert.equal(result, false);
        });
    });

    describe('PostRISRequest function', function () {
        it('PostRISRequest function should call service with api key and url from prefs', function () {
            var result = LibKount.PostRISRequest({}); // eslint-disable-line
            assert.equal(kountServiceMock.setURL.args[0][0], 'RIS_TEST_URL');
            assert.equal(kountServiceMock.addHeader.args[0][1], 'kount_APIKey_value');
        });

        it('PostRISRequest function should call service with provided keysVal', function () {
            var result = LibKount.PostRISRequest({ // eslint-disable-line
                key1: 'val1',
                key2: 'val2',
                key3: null
            });
            assert.equal(result.key1, 'val1');
            assert.equal(result.key2, 'val2');
        });

        it('PostRISRequest function should call service and handle UDF and UAGT params', function () {
            var result = LibKount.PostRISRequest({ // eslint-disable-line
                UDF: [{
                    label: 'label',
                    value: 'value'
                }],
                UAGT: {
                    key: 'value'
                },
                key1: ['value1', 'value2']
            });
            assert.equal(result['UDF[label]'], 'value');
            assert.equal(result['UAGT[0]'], 'key');
        });
    });

    describe('evaluateRISResponse function', function () {
        it('evaluateRISResponse function should return APPROVED status', function () {
            var result = LibKount.evaluateRISResponse({
                AUTO: 'A'
            });
            assert.equal(result, 'APPROVED');
        });

        it('evaluateRISResponse function should return DECLINED status', function () {
            var result = LibKount.evaluateRISResponse({
                AUTO: 'D'
            });
            assert.equal(result, 'DECLINED');
        });

        it('evaluateRISResponse function should return HOLD status', function () {
            var result = LibKount.evaluateRISResponse({
                AUTO: 'E'
            });
            assert.equal(result, 'HOLD');
        });

        it('evaluateRISResponse function should log error and send notification email', function () {
            LibKount.evaluateRISResponse({
                AUTO: 'E',
                ERRO: 'error here we go',
                ERROR_COUNT: 2,
                ERROR_0: 'error here we go'
            });
            assert.isTrue(logErrorFunction.called);
            assert.isTrue(mailObjMock.send.called);
        });

        it('evaluateRISResponse function should return HOLD status with warning logged', function () {
            var result = LibKount.evaluateRISResponse({
                AUTO: 'E',
                WARNING_0: 'here is a warning',
                WARNING_COUNT: 1
            });
            assert.equal(result, 'HOLD');
            assert.isTrue(logWarnFunction.called);
        });
    });

    describe('errors loggin functions', function () {
        it('writeExecutionError function should log error and send email', function () {
            LibKount.writeExecutionError('error message', null, 'error');
            assert.isTrue(logErrorFunction.called);
            assert.isTrue(mailObjMock.send.called);
        });

        it('writeExecutionError function should log warning', function () {
            LibKount.writeExecutionError('error message', null, 'warn');
            assert.isTrue(logWarnFunction.called);
        });

        it('writeExecutionError function should log info', function () {
            LibKount.writeExecutionError('error message', null, 'default');
            assert.isTrue(logInfoFunction.called);
        });
    });

    describe('plainTextHandler function', function () {
        it('plainTextHandler function should return false', function () {
            var result = LibKount.plainTextHandler('');
            assert.equal(result, false);
        });

        it('plainTextHandler function should return true', function () {
            var result = LibKount.plainTextHandler('first\nsecond');
            assert.equal(result, true);
        });

        it('plainTextHandler function should return true', function () {
            var result = LibKount.plainTextHandler('ERROR_\nsecond');
            assert.equal(result, true);
        });
    });

    describe('getUDFFields functions', function () {
        it('getUDFFields function should return object with proper label and value', function () {
            var result = LibKount.getUDFFields(orderMock);
            assert.equal(result[0].value, 'udfvalue');
            assert.equal(result[0].label, 'udflabel');
        });
    });

    describe('preRiskCall and postRiskCall functions', function () {
        it('preRiskCall function should throw an error', function () {
            var callback = sinon.spy();
            LibKount.preRiskCall(orderMock, callback, true);
            assert.isTrue(logErrorFunction.called);
        });

        it('preRiskCall function should return DECLINED status and call a callback', function () {
            orderMock.constructor = BasketClassMock;
            var callback = sinon.spy();
            var result = LibKount.preRiskCall(orderMock, callback, true);
            assert.equal(result.KountOrderStatus, 'DECLINED');
            assert.isTrue(callback.called);
            assert.equal(callback.args[0][0].KountOrderStatus, 'DECLINED');
        });

        it('postRiskCall function should return DECLINED status and fail order', function () {
            var callback = sinon.spy();
            var result = LibKount.postRiskCall(callback, orderMock, true);
            assert.equal(result.KountOrderStatus, 'DECLINED');
            assert.isTrue(OrderMgrMock.failOrder.called);
            assert.isTrue(callback.called);
        });
    });

    describe('getPayment function', function () {
        it('getPayment function should return CREDIT_CARD for one payment', function () {
            var paymentsMock = getPaymentsMock([{
                paymentMethod: 'CREDIT_CARD',
                getPaymentMethod: function () {
                    return 'CREDIT_CARD';
                }
            }]);
            var result = LibKount.getPayment(paymentsMock);
            assert.equal(result.paymentMethod, 'CREDIT_CARD');
        });

        it('getPayment function should return GIFT_CERTIFICATE for multiple payments', function () {
            var paymentsMock = getPaymentsMock([{
                paymentMethod: 'GIFT_CERTIFICATE',
                getPaymentMethod: function () {
                    return 'GIFT_CERTIFICATE';
                }
            }, {
                paymentMethod: 'GIFT_CERTIFICATE',
                getPaymentMethod: function () {
                    return 'GIFT_CERTIFICATE';
                }
            }]);
            var result = LibKount.getPayment(paymentsMock);
            assert.equal(result.paymentMethod, 'GIFT_CERTIFICATE');
        });

        it('getPayment function should return PayPal for multiple payments', function () {
            var paymentsMock = getPaymentsMock([{
                paymentMethod: 'PayPal',
                getPaymentMethod: function () {
                    return 'PayPal';
                }
            },
            {
                paymentMethod: 'GIFT_CERTIFICATE',
                getPaymentMethod: function () {
                    return 'GIFT_CERTIFICATE';
                }
            }]);
            var result = LibKount.getPayment(paymentsMock);
            assert.equal(result.paymentMethod, 'PayPal');
        });

        it('getPayment function should return CUSTOM_PAYMENT for multiple payments', function () {
            var paymentsMock = getPaymentsMock([{
                paymentMethod: 'CUSTOM_PAYMENT',
                getPaymentMethod: function () {
                    return 'CUSTOM_PAYMENT';
                }
            }, {
                paymentMethod: 'CUSTOM_PAYMENT',
                getPaymentMethod: function () {
                    return 'CUSTOM_PAYMENT';
                }
            }]);
            var result = LibKount.getPayment(paymentsMock);
            assert.equal(result.paymentMethod, 'CUSTOM_PAYMENT');
        });
    });

    describe('getSessionIframe function', function () {
        it('getSessionIframe function should return correct value', function () {
            var result = LibKount.getSessionIframe('sessionIframe-sessionIframe', 'basketUUID-basketUUID');
            assert.equal(result, 'sessionIframe_sessionIfrbasketUU');
        });
    });

    describe('queueENSEventsForProcessing function', function () {
        it('queueENSEventsForProcessing function should create custom object', function () {
            LibKount.queueENSEventsForProcessing({ prop: 'value' });
            assert.isTrue(CustomObjectMgrMock.createCustomObject.calledOnce, true);
            assert.equal(CustomObjectMgrMock.createCustomObject.args[0][1], 'UUID');
        });
    });

    describe('validateIpAddress function', function () {
        it('validateIpAddress function should return true', function () {
            var result = LibKount.validateIpAddress('10.0.0.0');
            assert.equal(result, true);
        });

        it('validateIpAddress function should return false', function () {
            var result = LibKount.validateIpAddress('192.168.0.1');
            assert.equal(result, false);
        });
    });
});
