'use strict';

var assert = require('chai').assert;
var proxyquire = require('proxyquire').noCallThru().noPreserveCache();

var urlUtilsMock = {
    staticURL: function (a) {
        return 'test' + a;
    }
};

var utilMock = {
    ArrayList: function () {
        var arr = [];
        return {
            add1: function (item) {
                arr.push(item);
            },
            toArray: function () {
                return arr;
            }
        };
    }
};

var XMLConstructorMock = function (arr) {
    this.arr = arr;
    this.children = function () {
        return arr;
    };
};

describe('KountUtils', function () {
    var KountUtils = null;

    beforeEach(function () {
        KountUtils = proxyquire('../../../../../cartridges/int_kount/cartridge/scripts/kount/kountUtils.js', {
            'dw/web/URLUtils': urlUtilsMock,
            'dw/util': utilMock
        });
        Object.defineProperty(KountUtils.__proto__, 'XML', { // eslint-disable-line
            value: XMLConstructorMock,
            configurable: true
        });
    });

    after(function () {
        delete KountUtils.__proto__.XML; // eslint-disable-line
    });

    describe('extend function', function () {
        it('should provide a extend function', function () {
            assert.isFunction(KountUtils.extend);
        });

        it('extend function should merge objects', function () {
            var result = KountUtils.extend({
                prop1: 'val1'
            }, {
                prop2: 'val2'
            });
            assert.equal(result.prop1, 'val1');
            assert.equal(result.prop2, 'val2');
        });

        it('extend function should merge nested objects', function () {
            var result = KountUtils.extend({
                prop1: 'val1',
                prop2: {
                    nested: 'nested'
                }
            }, {
                prop3: 'val2',
                prop4: {
                    nested: 'nested'
                }
            });
            assert.equal(result.prop1, 'val1');
            assert.equal(result.prop3, 'val2');
            assert.equal(result.prop2.nested, 'nested');
            assert.equal(result.prop4.nested, 'nested');
        });

        it('extend function should handle empty object', function () {
            var result = KountUtils.extend({}, {
                prop3: 'val2',
                prop4: {
                    nested: 'nested'
                }
            });
            assert.equal(result.prop3, 'val2');
            assert.equal(result.prop4.nested, 'nested');
        });
    });

    describe('parseEnsXMLtoObject function', function () {
        it('should provide a parseEnsXMLtoObject function', function () {
            assert.isFunction(KountUtils.parseEnsXMLtoObject);
        });

        it('parseEnsXMLtoObject function should return proper response', function () {
            var objMock = {
                name: 'name',
                key: new String('key'), // eslint-disable-line
                old_value: 'old_value',
                new_value: new String('new_value'), // eslint-disable-line
                occurred: 'occurred'
            };
            objMock.key['@order_number'] = 'order_number';
            objMock.key['@site'] = 'site';
            objMock.new_value['@reason_code'] = 'reason_code';
            var result = KountUtils.parseEnsXMLtoObject([objMock]);
            assert.equal(result[0].name, 'name');
            assert.equal(result[0].oldValue, 'old_value');
            assert.equal(result[0].newValue, 'new_value');
            assert.equal(result[0].reasonCode, 'reason_code');
        });
    });
});
