'use strict';

var assert = require('chai').assert;
var sinon = require('sinon');
var proxyquire = require('proxyquire').noCallThru().noPreserveCache();

var urlUtilsMock = {
    staticURL: function (a) {
        return 'test' + a;
    }
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

var hashMapPutFunc = sinon.spy();

var HashMapMock = function () {
    return {
        put: hashMapPutFunc
    };
};

var templateObjMock = {
    render: sinon.spy(function () {
        return {
            text: 'text'
        };
    })
};

var TemplateMock = function () {
    return templateObjMock;
};

describe('EmailHelper', function () {
    var EmailHelper = null;

    beforeEach(function () {
        EmailHelper = proxyquire('../../../../../cartridges/int_kount_sfra/cartridge/scripts/kount/emailHelper', {
            'dw/web/URLUtils': urlUtilsMock,
            'dw/net/Mail': MailMock,
            'dw/util/HashMap': HashMapMock,
            'dw/util/Template': TemplateMock
        });
        templateObjMock.render.reset();
        mailObjMock.send.reset();
        mailObjMock.addTo.reset();
        mailObjMock.setFrom.reset();
        mailObjMock.setSubject.reset();
        mailObjMock.setContent.reset();
        hashMapPutFunc.reset();
    });

    it('should provide a sendEmail function', function () {
        assert.isFunction(EmailHelper.sendEmail);
    });

    it('sendEmail function should send email using dw mail object based on provided args', function () {
        var args = {
            to: 'to@mail.com',
            from: 'from@mail.com',
            subject: 'subject',
            data: {
                prop1: 'val1',
                prop2: 'val2'
            }
        };
        EmailHelper.sendEmail(args);
        assert.isTrue(mailObjMock.send.calledOnce);
        assert.isTrue(mailObjMock.addTo.calledOnce);
        assert.isTrue(mailObjMock.setFrom.calledOnce);
        assert.isTrue(mailObjMock.setSubject.calledOnce);
        assert.equal(mailObjMock.addTo.args[0][0], 'to@mail.com');
        assert.equal(mailObjMock.setFrom.args[0][0], 'from@mail.com');
        assert.equal(mailObjMock.setSubject.args[0][0], 'subject');
        assert.equal(hashMapPutFunc.args[0][0], 'prop1');
        assert.equal(hashMapPutFunc.args[0][1], 'val1');
        assert.equal(hashMapPutFunc.args[1][0], 'prop2');
        assert.equal(hashMapPutFunc.args[1][1], 'val2');
    });
});
