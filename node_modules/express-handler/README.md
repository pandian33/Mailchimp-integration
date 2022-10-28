# Express Handler #

This node modules is designed for [express.js](http://expressjs.com). It can create a per-request `this` object for all express route handlers. With this `this` object, handlers can access `req`, `res` and `next` in any async function without closure or extra arguments.

## Install ##

Install this module through `npm`.

	npm install --save express-handler

## Usage ##

This node module provide a function to wrap route handler. Here is a typical way to use it.

```javascript
var fs = require('fs');
var express = require('express');
var handler = require('express-handler');
var app = express();

// Wrap a handler to provide `this` object.
app.get('/foo', handler(foo));
app.post('/bar', handler(bar));

// There is no need to list req, res and next in handler signature.
// All these arguments can be retrieved from `this` object.
function foo() {
	// Get req, res and next.
	var req = this.req;
	var res = this.res;
	var next = this.next;

	// `this` object is unique for one request.
	// Set any value on `this` to share it.
	this.myErrorCode = 500;

	// Bind current `this` object with an async function.
	fs.readFile('foo', this.wrap(readFoo));
}

function readFoo(err, data) {
	// Get res in async function through `this`.
	var res = this.res;

	if (err) {
		// Use shared value.
		res.status(this.myErrorCode);
		return;
	}

	res.send(data);
}

// Still want to use req and res as arguments?
// No problem. All arguments are forwarded from express to handler.
// So no need to modify existing handler code for express-handler.
function bar(req, res) {
	// The old way to write a handler...
}
```

## Extra features ##

This node module provides some extra features for special needs. All features are *disabled* by default.

Features can be enabled/disabled globally or per handler basis. `handler.set` is to update global feature status. The `feature` argument in `handler` is to set per handler features which will override global feature status.

```javascript
var handler = require('express-handler');

// Enable trace feature.
handler.set('trace', true);

// Disable trace feature only in this handler.
app.get('/foo', handler(foo, {trace: false}));
```

Following are all available features.

* `trace`: Trace all async calls' stack. It's useful when debugging in async function callback.
* `globalize`: Current running handler can be retrieved by `handler.current` anywhere.

### Use `trace` feature ###

Call stack in async function callback is not very meaningful. There is no way to find out which function initiate the async call inside the callback.

`trace` feature is designed to address the problem. With this feature, `Handler#stack` method can return current call stack plus stack of the function initiating the async call.

```javascript
// Enable "trace".
handler.set('trace', true);
app.get('/foo', handler())

function foo() {
	setTimeout(this.wrap(function() {
		console.log('Stack:\n%s', this.stack().join('\n'));
		// Will output something like following:
		//
		// Stack:
		//     at Handler.<anonymous> (/path/to/your/app.js:22:21)
        //     at null._onTimeout (/path/to/node_modules/express-handler/lib/handler.js:70:19)
        //     at Timer.listOnTimeout [as ontimeout] (timers.js:112:15)
        //
        //     at Handler.foo (/path/to/your/app.js:21:19)
        //     at /path/to/node_modules/express-handler/index.js:50:15
        //     at Layer.handle [as handle_request] (/path/to/node_modules/express/lib/router/layer.js:82:5)
        //     at next (/path/to/node_modules/express/lib/router/route.js:100:13)
        //     at Route.dispatch (/path/to/node_modules/express/lib/router/route.js:81:3)
        //     at Layer.handle [as handle_request] (/path/to/node_modules/express/lib/router/layer.js:82:5)
        //     at /path/to/node_modules/express/lib/router/index.js:235:24
        //     at Function.proto.process_params (/path/to/node_modules/express/lib/router/index.js:313:12)
        //     at /path/to/node_modules/eexpress/lib/router/index.js:229:12
	}), 100);
}
```

### Use `globalize` feature ###

With this feature, current running handler can be retrieved by `handler.current`. It makes current handler globally available anywhere in code like a global variable.

If this feature is disabled or there is no handler running, `handler.current` will return `null`.

```javascript
// ENable "globalize".
handler.set('globalize', true);
app.get('/foo', handler(foo));

function foo() {
	doSomething();
}

function doSomething() {
	// Get current running handler.
	var h = handler.current();
	// ...
}
```

## Extend handler object ##

`handler.Handler` is the constructor of handler's `this` object. Use `Handler.extend` to add new methods to `this` object.

Method `init` is a special case. If it exists in prototype, `Handler` will call it in constructor.

```javascript
var handler = require('express-handler');
var Handler = handler.Handler;

Handler.extend({
	f: function() {
		// ...
	}
});

app.get('/foo', handler(foo));

function foo() {
	this.f();
};
```

## License ##

This module is licensed under the MIT license that can be found in the LICENSE file.


