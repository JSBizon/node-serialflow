function Flow(serial, skipArbiter){
	var s = serial;
	var sA = skipArbiter;
	
	var doNext = function(){
		if(s._arbiter && ! sA){
			s._arbiter(Array.prototype.slice.call(arguments),new Flow(s,true));
		}else{
			s.next();
		}
	};
	
	var doError = function(error){
		s._doError(error);
	};
	
	var fn = function(error){
		if(error){
			doError(error);
		}else{
			var args = Array.prototype.slice.call(arguments);
			args.shift();
			doNext.apply(this,args);
		}
	};
	
	
	fn.next = doNext;
	fn.error = doError;
	fn.obj = serial;
	
	return fn;
}


function SerialFlow(){
	var self = this;
	
	self._error = null;
	self._done = null;
	self._arbiter = null;
	
	self._fns = [];
	self._args = [];
	self._scope = null;
	self._waiting = false;
	
	self.add.apply(self,arguments);
	
	process.nextTick(function(){ self.next(); });
}

SerialFlow.prototype.next = function(){
	var self = this;
	var fn = self._fns.shift();
	
	if(fn){
		var args = self._args.slice();
		
		var flow = new Flow(self);
		args.push(flow);
		try{
			fn.apply(self._scope, args);
		}
		catch(error){
			self._doError(error);
		}
	}else{
		self.cancel();
	}
};

SerialFlow.prototype.cancel = function(){
	this._waiting = true;
	this._fns = [];
	if(this._done){
		this._done();
	}
	return this;
};

SerialFlow.prototype.add = function(){
	var i = 0;
	for(i = 0; i < arguments.length ; i++){
		var item = arguments[i];
		if(typeof(item) === 'function'){
			this._fns.push(item);
		}else if(Array.isArray(item)){
			this._fns = this._fns.concat(item);
		}else{
			throw new Error("Argument must be a function or Array of function");
		}
	}

	if(this._waiting){
		this._waiting = true;
		this.next();
	}
	return this;
};

SerialFlow.prototype.scope = function(newScope){
	this._scope = newScope;
	return this;
};

SerialFlow.prototype.args = function(){
	this._args = Array.prototype.slice.call(arguments);
	return this;
};

SerialFlow.prototype.done = function(fn){
	if(fn && typeof(fn) !== 'function' ){
		throw new Error("Argument must be a function");
	}
	this._done = fn;
	return this;
};

SerialFlow.prototype.error = function(fn){
	if(fn && typeof(fn) !== 'function' ){
		throw new Error("Argument must be a function");
	}
	this._error = fn;
	return this;
};


SerialFlow.prototype._doError = function(error){
	this._fns = [];
	if(this._error){
		this._error(error);
	}
};

SerialFlow.prototype.arbiter = function(fn){
	if(fn && typeof(fn) !== 'function' ){
		throw new Error("Argument must be a function");
	}
	this._arbiter = fn;
	return this;
};


module.exports = SerialFlow;
