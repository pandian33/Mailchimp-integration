/**
 * Copyright 2015 Huan Du. All rights reserved.
 * Licensed under the MIT license that can be found in the LICENSE file.
 */
'use strict';

var _ = require('underscore');
var Handler = require('./lib/handler');

var defaultFeatures = {};

/**
 * Wrap a route handler function and prepare a `this` object for it.
 * @param {Function} fn
 * @param [features] Handler specific features. It can override global features.
 */
var handler = module.exports = function(fn, features) {
  if (typeof fn !== 'function') {
    throw new Error('fn must be a function.');
  }

  var features = _.extend({}, defaultFeatures, features);
  return function(req, res, next) {
    var handler = req._expressHandler;
    var ret;

    if (!handler) {
      Object.defineProperty(req, '_expressHandler', {
        value: new Handler()
      });
      handler = req._expressHandler;

      Object.defineProperty(handler, 'req', {
        value: req
      });
      Object.defineProperty(handler, 'res', {
        value: res
      });
      Object.defineProperty(handler, 'next', {
        value: null,
        writable: true
      });
    }

    handler.updateFeatures(features);
    handler.next = function() {
      handler.clearStack();
      next();
    };

    if (features.globalize) {
      Handler.pushHandler(handler);
    }

    try {
      return fn.call(handler, req, res, handler.next);
    } finally {
      if (features.globalize) {
        Handler.popHandler(handler);
      }
    }
  };
};

/**
 * Handler object constructor.
 */
handler.Handler = Handler;

/**
 * Enable/Disable extra features.
 * Supported features are listed as following.
 *
 *   - trace: Enable a handler to examine stack across async calls through Handler#stack().
 *   - globalize: Current running handler can be retrieved by handler.current().
 *
 * @param {String} feature
 * @param {Boolean} value
 */
handler.set = function(feature, value) {
  var availablefeatures = {
    trace: true,
    globalize: true
  };

  if (!availablefeatures.hasOwnProperty(feature)) {
    throw new Error('Invalid feature ' + feature + '.');
  }

  defaultFeatures[feature] = !!value;
};

/**
 * Get current running handler.
 * Enable `globalize` feature to true to enable this feature.
 */
handler.current = function() {
  return Handler.current();
};
