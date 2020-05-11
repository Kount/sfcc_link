'use strict';

var assert = require('chai').assert;
var sinon = require('sinon');
var proxyquire = require('proxyquire').noCallThru().noPreserveCache();

var LocalServiceRegistryMock = {
    createService: function (name, callbacksObj) {
        return callbacksObj;
    }
};

var svcMock = {
    setRequestMethod: sinon.stub(),
    addHeader: sinon.stub()
};

var libKountMock = {
    plainTextHandler: sinon.stub()
};

describe('initKount', function () {
    var initKount = null;

    beforeEach(function () {
        initKount = proxyquire('../../../../../cartridges/int_kount/cartridge/scripts/init/initKount', {
            'dw/svc/LocalServiceRegistry': LocalServiceRegistryMock,
            '~/cartridge/scripts/kount/LibKount': libKountMock
        });
        libKountMock.plainTextHandler.reset();
    });

    it('createRequest function should be setup', function () {
        assert.isFunction(initKount.createRequest);
    });

    it('parseResponse function should be setup', function () {
        assert.isFunction(initKount.parseResponse);
    });

    it('createRequest function should return arg string', function () {
        var result = initKount.createRequest(svcMock, {
            prop1: 'val1',
            prop2: 'val2'
        });
        assert.equal(result, 'prop1=val1&prop2=val2');
    });

    it('parseResponse function should parse response object', function () {
        var result = initKount.parseResponse(svcMock, {
            text: '{"prop1":"val1","prop2":"val2"}'
        });
        assert.equal(result.prop1, 'val1');
        assert.equal(result.prop2, 'val2');
    });

    it('parseResponse function should handle wrong json string', function () {
        var result = initKount.parseResponse(svcMock, {
            text: '{prop1}'
        });
        assert.isDefined(result.errorMessage);
        assert(libKountMock.plainTextHandler.called);
    });
});

