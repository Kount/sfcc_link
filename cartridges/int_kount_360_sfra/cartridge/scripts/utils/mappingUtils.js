/**
 * Sets a nested value in an object.
 *
 * @param {Object} obj - The object to set the value in.
 * @param {string} path - The path to the value, using dot notation (e.g. 'a.b.c').
 * @param {*} value - The value to set.
 */
function setNestedValue(obj, path, value) {
    var keys = path.split('.');
    var current = obj;

    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        if (/^\d+$/.test(key)) key = parseInt(key, 10);

        if (i === keys.length - 1) {
            current[key] = value;
        } else {
            var nextKey = keys[i + 1];
            var isNextArrayIndex = /^\d+$/.test(nextKey);
            if (
                typeof current[key] === 'undefined' ||
                current[key] === null ||
                typeof current[key] !== 'object'
            ) {
                current[key] = isNextArrayIndex ? [] : {};
            }
            current = current[key];
        }
    }
}

/**
 * Gets a nested value from an object.
 *
 * @param {Object} obj - The object to get the value from.
 * @param {string} path - The path to the value, using dot notation (e.g. 'a.b.c').
 * @returns {*} The value at the specified path, or undefined if it does not exist.
 */
function getNestedValue(obj, path) {
    if (!obj || typeof obj !== 'object') {
        return undefined;
    }

    var keys = path.split('.');
    var current = obj;

    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        if (/^\d+$/.test(key)) key = parseInt(key, 10);

        if (current == null || typeof current !== 'object' || !(key in current)) {
            return undefined;
        }

        current = current[key];
    }

    return current;
}

/**
 * Transforms an object based on a mapping configuration.
 *
 * @param {Object} mapping - The mapping configuration, where each key is a source path and each value is a target path.
 * @param {Object} source - The source object to transform.
 * @param {boolean} [sourceToTarget=false] - Whether to map source paths to target paths (true) or target paths to source paths (false).
 * @param {boolean} [stringifyValue=false] - Force stringify for nested value
 * @returns {Object} The transformed object.
 */
function transform(mapping, source, sourceToTarget, stringifyValue) {
    var result = {};
    var arrayGroups = {};
    var keysToFlatten = {}; // Track which keys should be flattened

    Object.keys(mapping).forEach(function (key) {
        if (!Object.hasOwnProperty.call(mapping, key)) { return; }
        var from = sourceToTarget ? key : mapping[key];
        var to = sourceToTarget ? mapping[key] : key;
        
        // Check for [*] in source path (from) for response mapping
        var sourceMatch = from.match(/^(.*?)\.\[\*\]\.(.+)$/);
        if (sourceMatch && !sourceToTarget) {
            // For response mapping: source has [*], target is the base key
            if (!arrayGroups[to]) arrayGroups[to] = [];
            arrayGroups[to].push({
                targetSubPath: sourceMatch[2],
                sourcePath: sourceMatch[1]
            });
            keysToFlatten[to] = true; // Mark this key for flattening
        } else {
            // Original logic for request mapping: target has [*]
            var match = to.match(/^(.*?)\.\[\*\]\.(.+)$/);
            if (match) {
                var base = match[1];
                if (!arrayGroups[base]) arrayGroups[base] = [];
                arrayGroups[base].push({
                    targetSubPath: match[2],
                    sourcePath: from
                });
            }
        }
    });

    /**
     * Processes a single array group mapping for a given index and key.
     * @param {Object} group - The mapping group
     * @param {number} arrIdx - The array index
     * @param {string} key - The base key for the group
     */
    function processArrayGroup(group, arrIdx, key) {
        var subPath = group.targetSubPath;
        var sourcePath = group.sourcePath;
        var sourceVal = getNestedValue(source, sourcePath);
        
        // For response mapping, sourceVal is the array, get element and extract subPath
        if (Array.isArray(sourceVal)) {
            var arrayElement = sourceVal[arrIdx];
            var value = subPath ? getNestedValue(arrayElement, subPath) : arrayElement;
            if (typeof value !== 'undefined') {
                var finalPath = key + '.' + arrIdx;
                setNestedValue(result, finalPath, stringifyValue ? String(value) : value);
            }
        } else {
            // Original logic for request mapping
            var value = Array.isArray(sourceVal) ? sourceVal[arrIdx] : sourceVal;
            if (typeof value !== 'undefined') {
                var finalPath = key + '.' + arrIdx + '.' + subPath;
                setNestedValue(result, finalPath, value);
            }
        }
    }

    /**
     * Calls processArrayGroup for each group in the arrayGroups for a given index and key.
     * @param {Object} group - The mapping group
     */
    function processGroupInArray(group) {
        processArrayGroup(group, this.arrIdx, this.baseKey);
    }

    Object.keys(arrayGroups).forEach(function (baseKey) {
        if (!Object.hasOwnProperty.call(arrayGroups, baseKey)) { return; }
        var maxLength = 0;
        arrayGroups[baseKey].forEach(function (group) {
            var sp = group.sourcePath;
            var val = getNestedValue(source, sp);
            if (Array.isArray(val)) {
                maxLength = Math.max(maxLength, val.length);
            }
        });
        if (maxLength === 0) maxLength = 1;
        for (var arrIdx = 0; arrIdx < maxLength; arrIdx++) {
            arrayGroups[baseKey].forEach(processGroupInArray, { arrIdx: arrIdx, baseKey: baseKey });
        }
    });

    Object.keys(mapping).forEach(function (mapKey) {
        if (!Object.hasOwnProperty.call(mapping, mapKey)) { return; }
        var sourcePath = sourceToTarget ? mapKey : mapping[mapKey];
        var targetPath = sourceToTarget ? mapping[mapKey] : mapKey;
        if (!/\[\*\]/.test(targetPath)) {
            var val = getNestedValue(source, sourcePath);
            if (typeof val !== 'undefined') {
                setNestedValue(result, targetPath, stringifyValue ? String(val) : val);
            }
        }
    });

    return flattenArrayNotation(result, keysToFlatten);
}

/**
 * Flattens nested array structures created by [*] notation.
 * Converts { "RULE_ID": { "0": "value1", "1": "value2" } } or { "RULE_ID": ["value1", "value2"] }
 * to { "RULE_ID_0": "value1", "RULE_ID_1": "value2" }
 *
 * @param {Object} obj - The object to flatten.
 * @param {Object} keysToFlatten - Object with keys that should be flattened (optional).
 * @returns {Object} The flattened object.
 */
function flattenArrayNotation(obj, keysToFlatten) {
    var result = {};
    
    Object.keys(obj).forEach(function (key) {
        var value = obj[key];
        
        // Only flatten if this key is marked for flattening or no filter is provided
        var shouldFlatten = !keysToFlatten || keysToFlatten[key];
        
        // Check if value is an array
        if (shouldFlatten && Array.isArray(value)) {
            // Flatten: RULE_ID[0] -> RULE_ID_0
            value.forEach(function (item, index) {
                result[key + '_' + index] = item;
            });
        } else if (shouldFlatten && value && typeof value === 'object') {
            // Check if value is an object with numeric keys (array-like structure)
            var keys = Object.keys(value);
            var isArrayLike = keys.length > 0 && keys.every(function (k) {
                return /^\d+$/.test(k);
            });
            
            if (isArrayLike) {
                // Flatten: RULE_ID.0 -> RULE_ID_0
                keys.forEach(function (index) {
                    result[key + '_' + index] = value[index];
                });
            } else {
                result[key] = value;
            }
        } else {
            result[key] = value;
        }
    });
    
    return result;
}

/**
 * Applies a custom mapping to an object.
 *
 * @param {Object} source - The source object to apply the mapping to.
 * @param {Object} mappingConfig - The custom mapping configuration, where each key is a property name and each value is an object with original values as keys and mapped values as values.
 * @returns {Object} The object with the custom mapping applied.
 */
function applyCustomMapping(source, mappingConfig) {
    var result = {};
    Object.keys(source).forEach(function (key) {
        var originalValue = source[key];
        if (
            Object.hasOwnProperty.call(mappingConfig, key) &&
            Object.hasOwnProperty.call(mappingConfig[key], originalValue)
        ) {
            result[key] = mappingConfig[key][originalValue];
        } else {
            result[key] = originalValue;
        }
    });

    return result;
}

module.exports = {
    transform: transform,
    applyCustomMapping: applyCustomMapping
};
