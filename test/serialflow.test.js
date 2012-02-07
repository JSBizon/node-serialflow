var SerialFlow = require('../index');
var fs = require('fs');
var should = require('should');


module.exports = {
	"test SerialFlow" : function(beforeExit){
		var num = 0;
		var data = {
			data : 'start'
		};
		
		var serialFlow = new SerialFlow([
			function(a,b,flow){
				//console.log("a", a, ", b: ", b, ", f", flow);
				setTimeout(function(){
					a.should.eql(1);
					b.data.should.eql('start');
					b.data = 'test1';
					
					num.should.eql(0);
					
					++num;
					flow.next();
				},300);
			},
			function(a,b,flow){
				setTimeout(function(){
					a.should.eql(1);
					b.data.should.eql('test1');
					b.data = 'test2';
					
					num.should.eql(1);
					
					++num;
					flow.next();
				},200);
			}
			],
			function(a,b,flow){
				setTimeout(function(){
					a.should.eql(1);
					b.data.should.eql('test2');
					b.data = 'test3';
					
					num.should.eql(2);
					
					++num;
					flow.next();
				},100);
			}
		).args(1,data);
		
		beforeExit(function(){
			data.data.should.eql('test3');
			num.should.eql(3);
		});
	},
	
	"test SerialFlow scope" : function(beforeExit){
		var num = 0;
		var func1 = function(data,flow){
			var self = this;
			setTimeout(function(){
				self.str1.should.eql('start');
				self.str1 = 'func1';
				self.setStr2('func1');
				
				data.str3.should.eql('test');
				data.str3 = 'func1';
				
				++num;
				flow.next();
			},400);
		};
		
		var func2 = function(data,flow){
			this.str1.should.eql('func1');
			this.str1 = 'func2'
				
			this.str2.should.eql('func1');
			this.setStr2('func2');
			
			data.str3.should.eql('func1');
			data.str3 = 'func2';
			
			++num;
			flow.next();
		};
		
		function MockObject(){
			this.str1 = 'start';
			this.str2 = 'fin';
		};
		
		MockObject.prototype.setStr2 = function(newStr){
			this.str2 = newStr;
		};
		
		MockObject.prototype.doTest = function(){
			var d = {
				str3 : 'test'
			};
			
			
			var flow = new SerialFlow([func1,func2]).args(d).scope(this);
			flow.add(function(data,flow){
				var self = this;
				setTimeout(function(){
					self.str1.should.eql('func2');
					self.str1 = 'func3';
					
					++num;
					flow.next();
				},100)
			});
		};
		
		var obj = new MockObject();
		
		obj.doTest();
		
		beforeExit(function(){
			obj.str1.should.eql('func3');
			num.should.eql(3);
		});
	},
	
	"test SerialFlow done" : function(beforeExit){
		var done = false;
		var num = 0;
		new SerialFlow()
			.add(function(flow){
					setTimeout(function(){
						num.should.eql(0);
						++num;
						flow.next();
					},50);
				},
				function(flow){
					setTimeout(function(){
						num.should.eql(1);
						++num;
						flow.next();
					},100);
				},
				function(flow){
					num.should.eql(2);
					++num;
					flow.next();
				}
			)
			.done(function(){
				done = true;
				num.should.eql(3);
			});
		
		beforeExit(function(){
			done.should.be.true;
		});
	},
	
	"test SerialFlow error" : function(beforeExit){
		var catchError = false,
			num1 = 0;
		new SerialFlow(
			function(flow){
				setTimeout(function(){
					++num1;
					flow.next();
				},50)
			},
			function(flow){
				++num1;
				throw new Error("Test error");
			},
			function(flow){
				++num1;
				flow.next();
			}
		)
		.error(function(error){
			catchError = true;
			should.exist(error);
		});
		
		beforeExit(function(){
			num1.should.eql(2);
			catchError.should.be.true;
		});
	},
	
	"test SerialFlow error2" : function(beforeExit){
		var catchError = false, num = 0;
		new SerialFlow(
				function(flow){
					setTimeout(function(){
						++num;
						flow.next();
					},50)
				},
				function(flow){
					++num;
					setTimeout(function(){
						flow.error();
					},20);
				},
				function(flow){
					++num;
					flow.next();
				}
		)
		.error(function(error){
			catchError = true;
		});
		
		beforeExit(function(){
			num.should.eql(2);
			catchError.should.be.true;
		});
	},
	
	"test SerialFlow arbiter" : function(beforeExit){
		
		var fNum = 0,num = 0, done = false;
		new SerialFlow(
			function(a,flow){
				++num;
				a.should.eql(10);
				setTimeout(function(){
					flow.next();
				},100);
			},
			function(a,b,flow){
				++num;
				a.should.eql(1);
				b.should.eql(2);
				flow.next();
			},
			function(){
				++num;
				flow.next();
			}
		)
		.done(function(){
			done = true;
		})
		.arbiter(function(nextArgs,flow){
			++fNum;
			if(fNum === 1){
				this.args(1,2);
				flow.next(); 
			}else{
				this.cancel();
			}
		})
		.args(10);
		
		beforeExit(function(){
			num.should.eql(2);
			done.should.be.true;
		});
	},
	
	"test SerialFlow callbacks" : function(beforeExit){
		var catchError = false;
		new SerialFlow(
			function(filePath,flow){
				fs.readFile(filePath,flow);
			}
		)
		.error(function(error){
			catchError = true;
		})
		.args(__dirname + '/test.txt');
		
		beforeExit(function(){
			catchError.should.be.true;
		});
	},
	
	"test SerialFlow callbacks2" : function(beforeExit){
		var done = false;
		new SerialFlow(
			function(filePath, flow){
				fs.writeFile(filePath,'test data string',flow);
			},
			
			function(filePath,flow){
				fs.readFile(filePath,flow);
			}
			
			,
			function(filePath,flow){
				fs.unlink(filePath,flow);
			}
			
		)
		.done(function(){
			done = true;
		})
		.args(__dirname + '/test.txt');
		
		beforeExit(function(){
			done.should.be.true;
		});
	},
	
	"test SerialFlow arbiter extension" : function(beforeExit){
		var done = false;
		new SerialFlow()
			.add(
				function(flow){
					setTimeout(function(){
						flow.next("first",2);
					},100);
				},
				function(arg1,arg2,flow){
					arguments.should.have.lengthOf(3);
					arg1.should.equal("first");
					arg2.should.equal(2);
					flow.next();
				},
				function(flow){
					arguments.should.have.lengthOf(1);
					flow.next();
				}
			)
			.arbiter(function(nextArgs,flow){
				this.args.apply(this,nextArgs);
				flow.next();
			})
			.done(function(){
				done = true;
			});
		
			beforeExit(function(){
				done.should.be.true;
			});
	},
	
	"test SerialFlow after done" : function(beforeExit){
		var done = false;
		var num= 0;
		var serialFlow = new SerialFlow(
			function(flow){
				setTimeout(function(){
					num.should.equal(0);
					++num;
					flow.next();
				},100);
			},
			
			function(flow){
				setTimeout(function(){
					num.should.equal(1);
					++num;
					flow.next();
				},30);
			}
		)
		.done(function(){
			this
				.add(function(flow){
						setTimeout(function(){
							num.should.equal(2);
							++num;
							flow.next();
						},100);
					},
					function(flow){
						setTimeout(function(){
							num.should.equal(3);
							++num;
							flow.next();
						},100);
					}
				)
				.done(function(){
					done = true;
				});
		});
		
		beforeExit(function(){
			num.should.equal(4);
			done.should.be.true;
		});
	}
	
};