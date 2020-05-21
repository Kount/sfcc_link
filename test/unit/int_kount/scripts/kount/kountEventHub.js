'use strict';

var assert = require('chai').assert;
var proxyquire = require('proxyquire').noCallThru().noPreserveCache();
var sinon = require('sinon');

var urlUtilsMock = {
    staticURL: function (a) {
        return 'test' + a;
    }
};

var orderMock = {
    getOrderNo: function () { return '123'; },
    id: '123',
    getGiftCertificateLineItems: function () {
        return {
            toArray: function () {
                return [{}];
            }
        };
    },
    custom: {
        kount_ENSF: false
    },
    status: {
        value: 1
    },
    setExportStatus: sinon.spy(),
    setConfirmationStatus: sinon.spy()
};
var reqMock = {
    locale: { id: 'en' }
};
var eventMock = {
    attributeName: 'testing',
    newValue: 'A'
};

var eventMockDeclined = {
    attributeName: 'testing',
    newValue: 'D'
};

var eventMockHold = {
    attributeName: 'testing',
    newValue: 'R'
};

var emptyFuncMock = function (obj) {
    return !obj;
};

var libKountMockSFRA = {
    isSFRA: function () { return true; },
    writeExecutionError: sinon.stub(),
    getNotificationEmail: function () {
        return 'NotificationEmail@mail.com';
    },
    sendEmailNotification: sinon.stub()
};

var emailModelMock = {
    get: sinon.spy(function () {
        return {
            setSubject: emailModelMock.get,
            setFrom: emailModelMock.get,
            send: emailModelMock.get
        };
    })
};

var orderModelMock = {
    submit: sinon.spy(function () {
        return {
        };
    })
};

var libKountMock = {
    isSFRA: function () { return false; },
    writeExecutionError: sinon.stub(),
    getNotificationEmail: function () {
        return 'NotificationEmail@mail.com';
    },
    getCoreScript: function () {
        return {
            getModel: function (modelName) {
                if (modelName === 'Email') {
                    return emailModelMock;
                } else if (modelName === 'Order') {
                    return orderModelMock;
                }
                return {};
            }
        };
    },
    sendEmailNotification: sinon.stub()
};

var OrderMgrMock = {
    failOrder: sinon.stub(),
    getOrder: function (orderNo) {
        if (orderNo === 'not_existred') {
            return null;
        }
        if (orderNo === 'kount_ENSF') {
            return {
                custom: {
                    kount_ENSF: true
                }
            };
        }
        if (orderNo === 'not_created_status') {
            return {
                custom: {
                    kount_ENSF: false
                },
                status: {
                    value: 0
                }
            };
        }
        return orderMock;
    }
};

var TransactionMock = {
    wrap: function (func) {
        return func();
    }
};

var siteMock = {
    getCustomPreferenceValue: function (attr) {
        switch (attr) {
            case 'kount_RISK_CHANGE_testing':
                return 1;
            default:
                return 'string';
        }
    }
};

var EmailHelperMock = {
    sendEmail: sinon.spy()
};

var PipelineMock = {
    execute: sinon.spy(function () {
        return [{}];
    })
};

var UpdateOrderStatusMock = {
    update: sinon.stub()
};

var UpdateCustomAttributeMock = {
    update: sinon.spy(function () {
        return {
            mailTo: 'testing@mail.com',
            orderStatus: 'StatusAPPROVED'
        };
    })
};

var CheckProductInventoryMock = {
    check: sinon.spy(function (order, callback) {
        callback(true);
    })
};

var CheckProductInventoryErrorMock = {
    check: sinon.spy(function (order, callback) {
        callback(false);
    })
};

var ResourceMock = {
    msg: sinon.stub()
};

var COHelpersMock = {
    sendConfirmationEmail: sinon.spy(),
    placeOrder: sinon.spy(function () {
        return { error: false };
    })
};

var GiftCertificateMock = {
    createGiftCertificateFromLineItem: sinon.spy(function () {
        return {};
    })
};

function getKountEventHub(isSFRA, inventoryExist) {
    return proxyquire('../../../../../cartridges/int_kount/cartridge/scripts/kount/kountEventHub', {
        'dw/web/URLUtils': urlUtilsMock,
        'dw/order/OrderMgr': OrderMgrMock,
        'dw/system/Site': {
            current: siteMock
        },
        'dw/order/Order': {
            ORDER_STATUS_CREATED: 1,
            EXPORT_STATUS_READY: 2,
            CONFIRMATION_STATUS_CONFIRMED: 3,
            EXPORT_STATUS_NOTEXPORTED: 4,
            CONFIRMATION_STATUS_NOTCONFIRMED: 5
        },
        'dw/web/Resource': ResourceMock,
        'dw/system/Pipeline': PipelineMock,
        'dw/system/Transaction': TransactionMock,
        '*/cartridge/scripts/kount/updateCustomAttribute': UpdateCustomAttributeMock,
        '*/cartridge/scripts/kount/updateOrderStatus': UpdateOrderStatusMock,
        '*/cartridge/scripts/kount/checkProductInventory': inventoryExist ? CheckProductInventoryMock : CheckProductInventoryErrorMock,
        '*/cartridge/scripts/kount/libKount': isSFRA ? libKountMockSFRA : libKountMock,
        '*/cartridge/scripts/checkout/checkoutHelpers': COHelpersMock,
        '*/cartridge/scripts/kount/emailHelper': EmailHelperMock,
        '*/cartridge/scripts/kount/kountConstants': {
            ALLOWED_RISK_PARAMS: ['testing']
        },
        '*/cartridge/scripts/models/GiftCertificateModel': GiftCertificateMock,
        'dw/system/Logger': {
            getLogger: function () { }
        }
    });
}

describe('KountEventHub', function () {
    var KountEventHub = null;
    var KountEventHub1 = null;

    before(function () {
        KountEventHub = getKountEventHub(true, true);
        KountEventHub1 = getKountEventHub(false, true);
        KountEventHub.__proto__.empty = emptyFuncMock; // eslint-disable-line
        KountEventHub1.__proto__.empty = emptyFuncMock; // eslint-disable-line
    });

    after(function () {
        delete KountEventHub.__proto__.empty; // eslint-disable-line
        delete KountEventHub1.__proto__.empty; // eslint-disable-line
    });

    beforeEach(function () {
        libKountMock.writeExecutionError.reset();
        libKountMockSFRA.writeExecutionError.reset();
        libKountMock.sendEmailNotification.reset();
        libKountMockSFRA.sendEmailNotification.reset();
        OrderMgrMock.failOrder.reset();
        EmailHelperMock.sendEmail.reset();
        PipelineMock.execute.reset();
        UpdateOrderStatusMock.update.reset();
        UpdateCustomAttributeMock.update.reset();
        CheckProductInventoryMock.check.reset();
        CheckProductInventoryErrorMock.check.reset();
        ResourceMock.msg.reset();
        COHelpersMock.sendConfirmationEmail.reset();
        emailModelMock.get.reset();
        GiftCertificateMock.createGiftCertificateFromLineItem.reset();
        orderMock.setExportStatus.reset();
        orderMock.setConfirmationStatus.reset();
    });

    it('Error function should call writeExecutionError', function () {
        KountEventHub.Error('123');
        assert.isTrue(libKountMockSFRA.writeExecutionError.calledOnce);
    });

    it('failOrder function should call fail order', function () {
        KountEventHub.failOrder(orderMock);
        assert.isTrue(OrderMgrMock.failOrder.calledOnce);
    });

    describe('KountEventHub - emails functions', function () {
        it('sendRiskMail function should send an email', function () {
            KountEventHub.sendRiskMail('test@mail.com', eventMock);
            assert.isTrue(EmailHelperMock.sendEmail.calledOnce);
            assert.equal(EmailHelperMock.sendEmail.args[0][0].to, 'test@mail.com');
            assert.equal(EmailHelperMock.sendEmail.args[0][0].from, 'NotificationEmail@mail.com');
        });

        it('sendRiskMail function should send an email using email model for not sfra', function () {
            KountEventHub1.sendRiskMail('test@mail.com', eventMock);
            assert.isTrue(emailModelMock.get.called);
        });

        it('sendMail function should call pipeline', function () {
            KountEventHub.sendMail('template', 'test@mail.com', 'subject', {});
            assert.isTrue(PipelineMock.execute.calledOnce);
            assert.equal(PipelineMock.execute.args[0][1].MailTo, 'test@mail.com');
            assert.equal(PipelineMock.execute.args[0][1].MailSubject, 'subject');
        });

        it('sendMail function should send an email using email model for not sfra', function () {
            KountEventHub1.sendMail('template', 'test@mail.com', 'subject', {});
            assert.isTrue(emailModelMock.get.called);
        });
    });

    describe('KountEventHub - createGiftCertificates function', function () {
        it('createGiftCertificates function should call pipeline and send email', function () {
            KountEventHub.createGiftCertificates(orderMock);
            assert.isTrue(PipelineMock.execute.called);
            assert.equal(PipelineMock.execute.args[0][1].Order.id, '123');
            assert.isTrue(ResourceMock.msg.calledOnce);
        });

        it('createGiftCertificates function should call GiftCertificate mock and send email for not sfra', function () {
            KountEventHub1.createGiftCertificates(orderMock);
            assert.isTrue(GiftCertificateMock.createGiftCertificateFromLineItem.called);
        });
    });

    describe('KountEventHub - proceedOrder function', function () {
        it('proceedOrder function should fail order for StatusDECLINED status', function () {
            KountEventHub.proceedOrder({
                orderStatus: 'StatusDECLINED'
            }, orderMock, reqMock);
            assert.isTrue(OrderMgrMock.failOrder.calledOnce);
        });

        it('proceedOrder function should send confirmation email for StatusAPPROVED status', function () {
            KountEventHub.proceedOrder({
                orderStatus: 'StatusAPPROVED'
            }, orderMock, reqMock);
            assert.isTrue(COHelpersMock.sendConfirmationEmail.calledOnce);
        });

        it('proceedOrder function should handle unknown status', function () {
            KountEventHub.proceedOrder({
                orderStatus: 'unknown'
            }, orderMock, reqMock);
            assert.isFalse(COHelpersMock.sendConfirmationEmail.called);
            assert.isFalse(OrderMgrMock.failOrder.called);
        });

        it('proceedOrder function should fail order for out of stock case', function () {
            var KountEventHub2 = getKountEventHub(true, false);
            KountEventHub2.proceedOrder({
                orderStatus: 'StatusAPPROVED'
            }, orderMock, reqMock);
            assert.isTrue(OrderMgrMock.failOrder.calledOnce);
        });

        it('proceedOrder function for StatusAPPROVED status and not sfra', function () {
            KountEventHub1.proceedOrder({
                orderStatus: 'StatusAPPROVED'
            }, orderMock, reqMock);
            assert.isTrue(orderModelMock.submit.called);
        });
    });

    describe('KountEventHub - WORKFLOW functions', function () {
        it('WORKFLOW_STATUS_EDIT function should set ready to export and confirmed order status for approved kount status', function () {
            KountEventHub.WORKFLOW_STATUS_EDIT(eventMock, reqMock); // eslint-disable-line
            assert.isTrue(UpdateCustomAttributeMock.update.calledOnce);
            assert.equal(orderMock.setExportStatus.args[0][0], 2);
            assert.equal(orderMock.setConfirmationStatus.args[0][0], 3);
        });

        it('WORKFLOW_STATUS_EDIT function should set not exported and not confirmed order status for declined kount status', function () {
            KountEventHub.WORKFLOW_STATUS_EDIT(eventMockDeclined, reqMock); // eslint-disable-line
            assert.isTrue(UpdateCustomAttributeMock.update.calledOnce);
            assert.equal(orderMock.setExportStatus.args[0][0], 4);
            assert.equal(orderMock.setConfirmationStatus.args[0][0], 5);
        });

        it('WORKFLOW_STATUS_EDIT function should call error function for not existed order', function () {
            KountEventHub.WORKFLOW_STATUS_EDIT({ // eslint-disable-line
                orderNo: 'not_existred'
            }, reqMock);
            assert.isTrue(libKountMockSFRA.writeExecutionError.calledOnce);
        });

        it('WORKFLOW_STATUS_EDIT function should sendEmailNotification and return false for order marked with kount_ENSF', function () {
            var result = KountEventHub.WORKFLOW_STATUS_EDIT({ // eslint-disable-line
                orderNo: 'kount_ENSF'
            }, reqMock);
            assert.isTrue(libKountMockSFRA.sendEmailNotification.calledOnce);
            assert.equal(result, false);
        });

        it('WORKFLOW_STATUS_EDIT function should sendEmailNotification and return false for order with not created status', function () {
            var result = KountEventHub.WORKFLOW_STATUS_EDIT({ // eslint-disable-line
                orderNo: 'not_created_status'
            }, reqMock);
            assert.isTrue(libKountMockSFRA.sendEmailNotification.calledOnce);
            assert.equal(result, false);
        });

        it('WORKFLOW_STATUS_EDIT function should sendEmailNotification and return false for kount hold status', function () {
            var result = KountEventHub.WORKFLOW_STATUS_EDIT(eventMockHold, reqMock); // eslint-disable-line
            assert.isTrue(libKountMockSFRA.sendEmailNotification.calledOnce);
            assert.equal(result, false);
        });

        it('WORKFLOW_REEVALUATE function should call sendRiskMail and AttrUpdater', function () {
            KountEventHub.WORKFLOW_REEVALUATE(eventMock); // eslint-disable-line
            assert.isTrue(EmailHelperMock.sendEmail.calledOnce);
            assert.isTrue(UpdateCustomAttributeMock.update.calledOnce);
        });

        it('WORKFLOW_NOTES_ADD function should call sendRiskMail and AttrUpdater', function () {
            KountEventHub.WORKFLOW_NOTES_ADD(eventMock); // eslint-disable-line
            assert.isTrue(EmailHelperMock.sendEmail.calledOnce);
            assert.isTrue(UpdateCustomAttributeMock.update.calledOnce);
        });

        it('RISK_CHANGE function should call sendRiskMail and AttrUpdater', function () {
            KountEventHub.RISK_CHANGE(eventMock); // eslint-disable-line
            assert.isTrue(EmailHelperMock.sendEmail.calledOnce);
            assert.isTrue(UpdateCustomAttributeMock.update.calledOnce);
        });
    });
});
