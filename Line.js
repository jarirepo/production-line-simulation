function Line(options) {
/**
	Production line

	A production line consists of at least one station, one input buffer and
	a output buffer. New items are input to the production line via the input 
	buffer.
	

	Line Properties:
		name 				- name for the production line
		inBuf 		  - reference to input buffer
		outBuf 			- reference to output buffer
		stations    - references to the first level of stations
		inputPeriod - input period (in millisecs.)
		timeStep    - number of simulation time steps (updates) executed
		
	Line Methods:
		getTime
		start
		stop
		reset
		update
		draw
		
	Version : 0.1
	Date    : 03/2017
	Author  : Jari Repo, jarirepo76@gmail.com	
	
**/
	
	this.p5 = options.p5;
	this.name = options.name;
	//this.stations = options.stations;
	this.stations = [];
	
	this.inBuf = options.inBuf;
	this.outBuf = options.outBuf;
	
	var inputPeriod = options.inputPeriod;		
	var timeStep = 0;
	var producedItems = 0;
	var productivity = 0;
	this.jammed = false;
	var Q = [];
	
	this.faulty = false;
	
	var _timer = NaN;
		
	this.getTime = function() {
		return timeStep;
	}
	
	this.start = function() {
		_timer = setInterval( function() {
			//code
		}, this.inputPeriod);
	}
	
	this.stop = function() {		
		clearInterval(_timer);
		_timer = NaN;
	}
	
	this.reset = function() {
		this.stop();
		timeStep = 0;
		producedItems = 0;
		productivity = 0;
		this.inBuf.reset();
		this.outBuf.reset();
	}
	
	this.update = function() {
		//update the state of the production line by backward propagation,
		//starting with the last station(s)
		
		timeStep++;
		
		if (0 && timeStep % inputPeriod == 0) {			
			this.inBuf.addItem(new Item());
		}

		//set station updated flag to false
		for (var i=0; i<this.outBuf.inStn.length; i++) {			
			var obj = this.outBuf.inStn[i];
			this.resetUpdate(obj);
		}
		
		var n0 = this.outBuf.items.length;
		
		//start backward propagation algorithm
		this.faulty = false;
		this.jammed = true;
		for (var i=0; i<this.outBuf.inStn.length; i++) {			
			var obj = this.outBuf.inStn[i];
			this.updater(obj);
		}

		var n1 = this.outBuf.items.length;
		
		producedItems += (n1-n0);
		
		//calculate productivity
		productivity = producedItems/timeStep * this.p5.frameRate() * 60;
		if (Q.length >= 500) {
				Q.shift();
		}
		Q.push(productivity);
		
		//auto-remove item from the line output buffer
		//producedItems = this.outBuf.items.length;
		//if (true) {
			//producedItems += this.outBuf.items.length;
			//this.outBuf.reset();					
		//}
	}
	
	this.updater = function(s) {
		//recursive update of stations
		if (s) {
			s.update(timeStep);			
			
			if (s.state === StationState.REPAIR) {
				this.faulty = true;
			}
			
			this.jammed = this.jammed && (s.inBuf.isFull() && s.outBuf.isFull());
			
			for (var i=0; i<s.prevStations.length; i++) {
				var obj = s.prevStations[i];
				this.updater(obj);
			}
		}
	}
	
	this.resetUpdate = function(s) {		
		if (s) {
			s.updated = false;			
			for (var i=0; i<s.prevStations.length; i++) {
				var obj = s.prevStations[i];
				this.resetUpdate(obj);
			}
		}
	}
	
	this.draw = function() {
		//draws the complete production line
		var xmin = this.inBuf.x,
				xmax = this.outBuf.x;	
				
		with (this.p5) {
			rectMode(CORNER);
			fill(0);
			stroke(255);		
			rect(xmin, 40, xmax-xmin, height-80);
			
			rectMode(CENTER);
			var w = textWidth(this.name);
			rect(width/2, 40, 2.0*w, 30);
			textAlign(CENTER, CENTER);
			noStroke();
			fill(200,200,50);
			text(this.name, width/2, 40);
		}
		
		//output the productivity, Q
		this.p5.beginShape();
		this.p5.strokeWeight(1);
		this.p5.stroke(172,211,115);
		this.p5.noFill();
		for (var i=0; i<Q.length; i++) {			
			var px = 40 + i;
			var py = this.p5.height-50 - .05*Q[i];
			this.p5.vertex(px, py);
		}
		this.p5.endShape();				
		
		//this.inBuf.draw();
		//this.outBuf.draw();
		for (var i=0; i<this.stations.length; i++) {
			this.drawConnections(this.stations[i]);
			this.drawStation(this.stations[i]);
		}
				
		with (this.p5) {
			fill(51);
			noStroke();
			rectMode(CORNER);
			rect(0, 0, width, 25);
			fill(255);
			textSize(14);
			textAlign(LEFT, BASELINE);
			text('Time step: ' + nf(timeStep,5), 6, 12);	
			text('Input: ' + nf(this.inBuf.items.length,3), 110, 12);
			text('Output: ' + nf(this.outBuf.items.length,3), 175, 12);
			text('Productivity: ' + Math.floor(productivity) + ' units/min', 250, 12);			
		}		
		
	}
		
	
	this.drawConnections = function(s) {
		if (s) {
			//draw connection from station s to the in/out buffers
			//we want the lines to appear behind the stations and buffers
			//in order to not disrubt the station and buffer labels
			with (this.p5) {
				strokeWeight(1);
				stroke(192);
				line(s.x, s.y, s.inBuf.x, s.inBuf.y);
				line(s.x, s.y, s.outBuf.x, s.outBuf.y);				
			}
			var n = s.nextStations.length;									
			for (var i=0; i<n; i++) {				
				var obj = s.nextStations[i];									
				this.p5.stroke(51);
				this.p5.line(s.x, s.y, obj.x, obj.y);				
				this.drawConnections(obj);
			}			
		}		
	}
	
	this.drawStation = function(s) {
		//draws subsequent stations recursively			
		if (s) {
			var n = s.nextStations.length;						
			for (var i=0; i<n; i++) {
				var obj = s.nextStations[i];									
				this.drawStation(obj);
			}			
			s.draw();			
			s.inBuf.draw();
			s.outBuf.draw();
		}				
	}
}
