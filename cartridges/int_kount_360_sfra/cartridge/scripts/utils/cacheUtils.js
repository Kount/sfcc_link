'use strict';

var CacheMgr = require('dw/system/CacheMgr');

/**
 * Retrieves cache instance
 * @param {string} key - cache type
 * @returns {dw.system.Cache} - Cache instance.
 */
function getCustomCache(key) {
    return CacheMgr.getCache(key);
}

/**
 * Adds an entry to the cache instance.
 *
 * @param {string} type - cache type
 * @param {string} key Object to be used to generate a cache key.
 * @param {Object} valueObject Object to be cached.
 */
function putCache(type, key, valueObject) {
    var cache = getCustomCache(type);
    cache.put(key, valueObject);
}

/**
 * Invalidates an entry in the cache instance.
 * @param {string} type - cache type
 * @param {string} key Request body object.
 */
function invalidateCache(type, key) {
    var cache = getCustomCache(type);
    cache.invalidate(key);
}

/**
 * Retreives an entry from the cache instance.
 * @param {string} type - cache type
 * @param {string} key - Cache key
 * @param {Function} loaderFunction - callback function
 * @returns {Object|undefined} Cached value or undefined if loaderFunction not provided.
 */
function getCache(type, key, loaderFunction) {
    var Logger = require('dw/system/Logger').getLogger('kount-360', 'cache');
    var cache = getCustomCache(type);
    var callback = (typeof loaderFunction === 'function') ? loaderFunction : null;
    var cached;
    try {
        if (callback) {
            cached = cache.get(key, callback);
        } else {
            cached = cache.get(key);
        }
    } catch (e) {
        Logger.error('Unable to retrieve cache for type: {0}, error: {1}, stack: {2}', type, e.message, e.stack);
    }
    return cached;
}

module.exports = {
    putCache: putCache,
    invalidateCache: invalidateCache,
    getCache: getCache
};
