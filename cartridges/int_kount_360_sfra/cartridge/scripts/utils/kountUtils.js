'use strict';

/**
 * @description Extends an object with properties from other objects
 * @param {Object} target - The target object to be extended
 * @param {...Object} source - The source objects to be merged into the target object
 * @returns {Object} The extended target object
 */
module.exports = {
    extend: function (target, source) {
        var curSource;

        if (!target) {
            return source;
        }

        for (var i = 1; i < arguments.length; i++) {
            curSource = arguments[i];
            // eslint-disable-next-line no-restricted-syntax
            for (var prop in curSource) {
                // recurse for non-API objects
                if (curSource[prop] && typeof curSource[prop] === 'object' && !curSource[prop].class) {
                    // eslint-disable-next-line no-param-reassign
                    target[prop] = this.extend(target[prop], curSource[prop]);
                } else {
                    // eslint-disable-next-line no-param-reassign
                    target[prop] = curSource[prop];
                }
            }
        }

        return target;
    }
};
