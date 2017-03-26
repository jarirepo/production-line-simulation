const StationState = {
	WAITING: 0,
	BUSY: 1,
	REPAIR: 2
};

function Station(options) {
/** 
	A station is any process or set of activities or tasks required to fulfill 
	the goals of a production line.
	
	The duration of these tasks is specified by the throughput time (tpTime)
	for the station.
	
	A station receives its input from an input buffer and places its output 
	into an output buffer.
	
	A station may have one of the following states:
		WAITING - a station waits to start processing
		BUSY    - a station is busy with processing
		REPAIR  - a station has a failure and undergoes maintenance during a specific time period.
	
	Station Properties:
		name      - name of the station
		pLine 		- reference to the production line
		inBuf 		- reference to an input buffer
		outBuf 		- reference to an output buffer
		tpTime  	- nominal station throughput time
		pFail 		- uniform probability of failure
		tRepair   - nominal station repair time
		x, y   		- center X- and Y-coordinates for the rectangular box
		nFail     - total number of station failures
		state     - current stattion state, IDLE|BUSY|REPAIR
		tStart 		- last time when the station was started
		tStop 		- last time when the station was stopped
		tProd			- total productive time
		tWait			- total waiting (non-productive) time
		item 			- reference to the held item
		
	Station Methods:
		linkTo
		reset
		update
		draw

	Features:
		-station states are indicated by colored circles (blue; waiting, green: busy, red: repair)
		
	Version : 0.1
	Date    : 03/2017
	Author  : Jari Repo, jarirepo76@gmail.com		
**/
	
	this.p5 = options.p5;
	this.pLine = options.pLine;
	this.name = options.name;
	this.inBuf = options.inBuf;	
	this.outBuf = options.outBuf;	
	this.tpTime = options.tpTime;
	this.pFail = options.pFail;
	this.tRepair = options.tRepair;
	this.x = options.x;
	this.y = options.y;
	this.prevStations = [];
	this.nextStations = [];
	
	this.state = StationState.WAITING;
	this.tStart = NaN;
	this.tStop = NaN;
	this.tProd = 0;
	this.tWait = 0;
	this.item = null;
	this.updated = false;
	
	if (this.inBuf) {
		this.inBuf.outStn.push(this);
	}
	if (this.outBuf) {
		this.outBuf.inStn.push(this);
	}	
	
	var COLOR_WAITING = this.p5.color(0,0,200);
	var COLOR_BUSY = this.p5.color(0,200,0);
	var COLOR_REPAIR = this.p5.color(200,0,0);	
	
	this.reset = function() {
		if (this.inBuf) {
			this.inBuf.reset();
		}
		if (this.outBuf) {
			this.outBuf.reset();
		}
		this.state = StationState.WAITING;
		this.tStart = NaN;
		this.tStop = NaN;
		this.tProd = 0;
		this.tWait = 0;
		this.item = null;
		this.updated = false;
	}	
}

Station.prototype.linkTo = function(stationAfter) {
	//creates a bi-directional link between this and the next station 
	//console.log('Linking %s with %s', this.name, stationAfter.name);
	this.nextStations.push(stationAfter);
	stationAfter.prevStations.push(this);
}

Station.prototype.update = function( t ) {
	//var t = this.pLine.getTime();
	if (this.updated)
		return;
	
	switch (this.state) {
		case StationState.WAITING:
			this.tWait++;
			//get an item from the input buffer (if anything there)
			var item = this.inBuf.removeItem();
			if (item !== undefined) {
				this.state = StationState.BUSY;
				this.tStart = t;
				this.item = item;
			}
			break;
			
		case StationState.BUSY:
			//check if task is completed
			if (t - this.tStart >= this.tpTime) {
				//place item into the output buffer (if possible)
				if (this.outBuf.addItem(this.item)) {
					this.tProd += this.tpTime;
					this.item = null;
					this.state = StationState.WAITING;
					
					//simulated failure
					if (Math.random() < this.pFail) {
						this.state = StationState.REPAIR;
						this.nFail++;
						this.tStart = t;
						//console.log('Failure in ' + this.name);
					}else {
						//this.state = StationState.WAITING;						
						//this.tStart = t;
						//get an item from the input buffer (if anything there)
						var item = this.inBuf.removeItem();
						if (item !== undefined) {
							this.state = StationState.BUSY;
							this.tStart = t;
							this.item = item;
						}						
					}
				}else {
					//remain in busy state
					this.tWait++;
				}
			}
			break;
			
		case StationState.REPAIR:
			//check if repair is completed
			if (t - this.tStart >= this.tRepair) {
				this.tWait += this.tRepair;
				//get an item from the input buffer (if anything there)
				var item = this.inBuf.removeItem();
				if (item !== undefined) {
					this.state = StationState.BUSY;
					this.tStart = t;
					this.item = item;
				}else {
					//remain in a waiting state
					this.state = StationState.WAITING;
				}			
			}else {
				this.tWait++;
			}
			break;
			
		default:
			break;			
	}
	
	this.updated = true;
}

Station.prototype.draw = function() {
	//draws a station
	var w = this.p5.textWidth(this.name),
			h = this.p5.textSize();
	
	this.p5.fill(102);
	this.p5.stroke(255);
	this.p5.strokeWeight(1);
	this.p5.rectMode(this.p5.CENTER);
	this.p5.rect(this.x, this.y, 1.5*w, 2.0*h);
	
	//label
	this.p5.textAlign(this.p5.CENTER, this.p5.CENTER);
	this.p5.noStroke();
	this.p5.fill(255);
	this.p5.text(this.name, this.x, this.y);	
	
	//state indicator (filled circle depending on the state)
	var clr;
	switch (this.state) {
		case StationState.WAITING:
			clr = this.p5.color(0,0,200);
			break;
		case StationState.BUSY:
			clr = this.p5.color(0,200,0);
			break;
		case StationState.REPAIR:
			clr = this.p5.color(200,0,0);
			break;
	}
	this.p5.fill(clr);
	this.p5.ellipse(this.x + 1.5*w/2-6, this.y - 2.0*h/2+6, 6, 6);
}
