/**
 * Copyright 2015 Huan Du. All rights reserved.
 * Licensed under the MIT license that can be found in the LICENSE file.
 */
'use strict';

var _ = require('underscore');

var handlerStack = [];

function Handler() {
  this._features = {};
  this.clearStack();

  if (typeof this.init === 'function') {
    this.init.call(this);
  }
}

module.exports = Handler;

/**
 * Get current running handler.
 * Turn on "globalize" feature to enable this feature.
 */
Handler.current = function() {
  if (!handlerStack.length) {
    return null;
  }

  return handlerStack[handlerStack.length - 1];
};

/**
 * Extend Handler's prototype with provided proto.
 * @param {Object} proto
 */
Handler.extend = function(proto) {
  _.extend(Handler.prototype, proto);
  return Handler;
};

/**
 * Wrap a function to bind current handler object as `this`.
 * @param {Function} fn
 * @param [args...]
 */
Handler.prototype.wrap = function(fn, args) {
  var handler = this;
  var e, stack;

  // Need to save call stack for async function.
  if (this._features.trace) {
    e = new Error();
    stack = e.stack.split('\n').slice(1);
    stack[0] = ''; // use blank string as a marker.
    stack.push.apply(stack, handler._callStack);
    handler._callStack = stack;
  }

  if (typeof fn !== 'function') {
    throw new Error('fn must be a funcion.');
  }

  // Need to bind arguments.
  if (arguments.length > 1) {
    args = [].slice.call(arguments, 1);
  } else {
    // No need to bind arguments.
    args = undefined;
  }

  return function() {
    var globalize = handler._features.globalize;

    // Use handler stack to make current handler available globally.
    if (globalize) {
      Handler.pushHandler(handler);
    }

    try {
      if (args) {
        return fn.apply(handler, args);
      } else {
        return fn.call(handler);
      }
    } finally {
      if (globalize) {
        Handler.popHandler(handler);
      }
    }
  };
};

/**
 * Get current call stack as an array.
 *
 * Handler can trace stack before any async call if the "trace" feature is enabled and
 * async call is wrapped with Handler#wrap. In this case, returned value will include
 * all stacks starting from where express first calls route handler.
 */
Handler.prototype.stack = function() {
  var e = new Error();
  var stack = e.stack.split('\n').slice(2);

  if (!this._callStack) {
    return stack;
  }

  stack.push.apply(stack, this._callStack);
  return stack;
};

/**
 * Clear stored async stack.
 */
Handler.prototype.clearStack = function() {
  if (this._features.trace) {
    this._callStack = [];
  } else {
    this._callstack = undefined;
  }
};

/**
 * Update enabled features.
 */
Handler.prototype.updateFeatures = function(features) {
  this._features = features || {};
};

Handler.pushHandler = function(handler) {
  handlerStack.push(handler);
}

Handler.popHandler = function(handler) {
  // Handler stack corrupts.
  if (handler !== handlerStack[handlerStack.length - 1]) {
    throw new Error('cannot pop a handler which is not current handler.');
  }

  handlerStack.pop();
}