function Buffer(options) {
/**
	FIFO buffer (First In First Out)
	
	A buffer is used as temporary storage of items under production.
	A buffer can be shared between multiple stations.
	A station can have one output buffer which is the input buffer 
	to the station that follows.
	
	Buffer Properties:
		p5 			 - reference to the p5 instance
		name		 - buffer name, Example: 'B1','B2',...
		x,y		 	 - on-screen buffer center position
		capacity - maximum number of items in the buffer
		items 	 - buffered items (FIFO-buffer)
		inStn  	 - references to input stations
		outStn 	 - references to output stations
		
	Buffer Methods:
		addItem
		removeItem
		isFull
		reset
		draw
	
	Features:
		-full buffers are indicated by a red circular border
		-added references to the input and output stations
		-buffer sizes indicated by a scaled circles
		
	Version : 0.1
	Date    : 03/2017
	Author  : Jari Repo, jarirepo76@gmail.com
**/
	
	this.MAX_BUFFER_CAPACITY = 100;
	
	this.p5 = options.p5;
	this.name = options.name;
	this.capacity = options.capacity;
	this.capacity = this.p5.constrain(this.capacity, 0, this.MAX_BUFFER_CAPACITY);
	this.x = options.x;
	this.y = options.y;
	this.radius = NaN;
	this.items = [];
	this.inStn = [];	
	this.outStn = [];
}

Buffer.prototype.addItem = function(item) {
	//returns true if the item was inserted into the buffer
	var n = this.items.length;
	if (n < this.capacity) {
		this.items.push(item);
		return true;
	}else {	
		return false;
	}
}

Buffer.prototype.removeItem = function() {
	//removes an item from the buffer according to the FIFO principle
	//if there are no items to be removed the returned value is undefined
	return this.items.shift();
}

Buffer.prototype.isFull = function() {
	return (this.items.length == this.capacity)? true : false;
}

Buffer.prototype.isEmpty = function() {
	return (this.items.length == 0)? true : false;
}

Buffer.prototype.reset = function() {
	//removes all buffered items
	//this.items.splice();
	while (this.items.length > 0) {
		this.items.shift();
	}
}

Buffer.prototype.draw = function() {
	var w = this.p5.textWidth(this.name);
	var n = this.items.length;
	var p = this.items.length/this.capacity;
	var dr = getRadiusIncr(p);	
	//this.radius = w+dr;
	//this.radius = 15+dr;
	//this.radius = this.p5.map(this.items.length, 0, 100, 15, 30);
	//this.radius = Math.sqrt(1/)
	
	var area = this.p5.map(this.items.length, 0, this.MAX_BUFFER_CAPACITY, 500, 2000);
	this.radius = Math.sqrt(area/Math.PI);
	
	with (this.p5) {
		//circle indicating full buffer
		strokeWeight(1);
		//noFill();
		fill(0, 200);
		area = this.p5.map(this.capacity, 0, this.MAX_BUFFER_CAPACITY, 500, 2000);
		var r = Math.sqrt(area/Math.PI);
		stroke(102);
		ellipse(this.x, this.y, 2.0*r, 2.0*r);
		
		//circle indicating the actual number of items contained in the buffer
		//fill(102);
		//fill(246,142,86);
		//fill(158,11,15);
		fill(0,91,127);
		//stroke(255);
		if (!this.isFull())
			stroke(255);
		else
			stroke(255,0,0);
		
		ellipse(this.x, this.y, 2.0*this.radius, 2.0*this.radius);	
		
		//text
		textAlign(CENTER, CENTER);
		noStroke();
		fill(255);
		text(this.name, this.x, this.y);		
		
	}
	
	function getRadiusIncr( p ) {
		//A = pi*r^2
		//r = sqrt(A/pi)
		return 20*Math.sqrt(p/Math.PI);	
	}	
}

Buffer.prototype.mouseInside = function() {
	var dx = this.x - this.p5.mouseX,
			dy = this.y - this.p5.mouseY;
	var d = Math.sqrt(dx*dx + dy*dy);
	return (d < this.radius)? true : false;	
}
