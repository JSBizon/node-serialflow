# Introduction
node-serialflow - this is lightweight chainable control flow library. 
This library allow create middleware layer how it doing `connect`. 

## Installation
If you have npm installed, you can simply type:

	npm install serialflow
	
Or you can clone this repository using the git command:

	git clone git://github.com/JSBizon/node-serialflow.git

##Usage:
========

###Execution in order
---------------------

Serial write to file, read from this file, remove file with error handling: 

	new SerialFlow(
		function(filePath, flow){
			fs.writeFile(filePath,'test data string',flow);
		},
		
		function(filePath,flow){
			fs.readFile(filePath,flow);
		},
		function(filePath,flow){
			fs.unlink(filePath,flow);
		}	
	)
	.done(function(){
		console.log('All done!');
	})
	.error(function(error){
		console.log('Error occured ',error);
	})
	.args('test.txt');

###Generate and handle error asynchronous
---------------

	new SerialFlow()
	.add(
		function(flow){
			flow.next();
		},
		function(flow){
			flow.error("Test error");
		},
		function(flow){
			console.log("This function won't executed");
		}
	)
	.error(function(error){
		console.log("Error " + error + " occurred");
	});

###Setup arguments for functions kind of middlewares
----------------------------------------------------

	new SerialFlow()
		.args(req,res)
		.add(
			function(req,res,flow){
				flow.next();
			},
			function(req,res,flow){
				//stop execution. Clearing functions queue.
				flow.obj.cancel();
			},
			function(){
				flow.next();
			}
	)
	.done(function(){
		console.log("Done!!!");
	});
	
###Control execution
--------------------

	var num = 0;
	new SerialFlow(
			function(req,res,flow){
				flow.next();
			},
			function(req,res,flow){
				//stop execution. Clearing functions queue.
				flow.next();
			},
			function(){
				flow.next();
			}
	)
	.arbiter(function(nextArgs,flow){
		//This function will be called after every execution.
		++num;
		if(num === 2){
			this.cancel();
		}
	});


## API
======

The library exports a class SerialFlow. All methods of this class are chainable.

###SerialFlow([functions or array of functions])
------------------------------------------------

The constructor function creates new SerialFlow object. It accepts any number of functions or array of functions as arguments and runs them in serial order. Constructor doing the same, and take the same arguments function `add()`.
Every function will be called with arguments setuped by function `.args`, last argument is object function `flow`.
When the `flow` called the first argument is error object or message. It's compatible with standard javascript's callback, where first argument is error and next arguments are data:

	fs.readFile(path,flow);

The `flow` has next methods and variables:

	flow.next() - step to the next execution without error. Equal to flow() call.
	flow.error(error) - generate error. The function's queue will cleared. 
	flow.obj - reference on current `SerialFlow` object.

Create `SerialFlow` object:

	new SerialFlow(
		function(flow){
		....
		},
		[
			function(flow){
			....
			},
			function(flow){
			....
			}
		]
	);


###.add(functions or array of functions)
----------------------------------------

Add function(s) to the serial queue. This  method doing the same constructor, but can be called in any time. For example we can add some functions to the queue after queue was done:

	.done(function(){
		this
			.add(function(flow){
				....
				},
				function(flow){
				....
				}
			).done(null);
	});

###.error(fn)
-------------

Handle error. Register callback which will handle error. To this function will passed one argument - error.

	.error(function (err) {
		console.log(err)
	})

###.done(fn)
------------

Register done callback. 

###.scope(object)
-----------------

Register object which will `this` for all executed functions.

	function Foo(){....}
	function boo(){....};
	function coo(){....};
	var foo = new Foo();
	
	new SerialFlow()
		.add(boo,coo)
		.scope(foo);

###.arbiter(fn)
---------------

Register arbiter for `SerialFlow`. This callback will called after every function execution. This is powerful mechanism for control execution flow. 

For example register function which will send the result as the arguments to the next function. 

	.arbiter(function(nextArgs,flow){
		this.args.apply(this,nextArgs);
		flow.next();
	});

###.cancel()
------------

This function interrupt execution flow. Function's queue clear too. If done callback is registered, will called too.

##License
=========

MIT