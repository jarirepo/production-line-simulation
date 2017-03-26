/*****************************************************************************
sketch.js

Simulation of a production line with multiple, possibly paralell, stations and
various buffer capacities.
Imlementation of a non-deterministic multi-stage producer-consumer pattern.
Lots of interesting possibilities.

Description:
Discrete-time simulation of a factory-like production line based on JavaScript. 
It supports multiple stations which can be linked serially, in paralell or in 
any combination thereof.

Other features:
-The production line is implemented as a multi-level bi-directional linked list 
 where each station is aware of the station that follows but also on the previous 
 stations
-The input to a station is drawn either directly from a previous station or from 
 a FIFO-buffer
-Configurable station throughput times, buffer sizes, failure probabilities
-Supports shared buffers between stations
-Simulated station failures which affect the overall production rate
-The visual output of the full production line is based on forward recursion
-Time-based update of the production line based on a recursive backward propagation 
 algorithm
-Generates a realtime performance metric in terms of the overall productivity
		
Dependencies:	
	Line.js
	Station.js
	Buffer.js
		
Dependencies:
	Line
	Station
	Buffer
	Item	
	
Remarks:
	-Running the instance mode of p5.js
	
Resources:
"repair symbol"
https://www.google.se/search?hl=sv&site=imghp&tbm=isch&source=hp&biw=1536&bih=759&q=repair+symbol&oq=repair+symbol&gs_l=img.3..0i19k1l2j0i5i30i19k1.840.3008.0.3686.14.14.0.0.0.0.95.845.13.13.0....0...1.1.64.img..1.13.840.0..0j0i30k1j0i8i30i19k1.P1hojc9YQDU#imgrc=6aIINE-4O9SU-M:	
Sounds
http://soundbible.com/287-Industrial-Alarm.html
	
Version : 0.1
Date    : 03/2017
Author  : Jari Repo, jarirepo76@gmail.com

Change log
	- added coordinates to Station and Buffer for on-screen drawing
	- correct drawing of the stations, buffers and connection line
	
Possible improvements:
  - avoid drawing stations and buffer more than once
	- indicate flows (connections) by arrows instead of center-based lines
	- separate the model from the visual elements
	
*****************************************************************************/

function sketch(p) {
	const DEBUG = true;
	const INPUT_BATCH_SIZE = 50;
	const OUTPUT_BATCH_SIZE = 25;
	
	var testLine;
	var started = false;
	var autoAddInput = false;
	var autoRemoveOutput = false;
	
	var stateStr = ['Waiting','Busy','Repair'];
	var stateClr = [];
	
	var stations = [];
	
	//const REPAIR_IMAGE_URL = 'https://s-media-cache-ak0.pinimg.com/originals/b7/f5/7e/b7f57ed2cb73041d0e87b32456c82a5c.png';
	this.images = {};
	this.sounds = {};
	
	p.preload = function() {		
		this.images['repair'] = p.loadImage('data/repair.png');
		this.sounds['alert'] = p.loadSound('data/alarm.wav');
	}
	
	p.setup = function() {
		p.createCanvas(575, 350);
		p.frameRate(24);
		
		//p.textFont('Cambria');
		p.textFont('Calibri');
		p.textSize(14);
		p.textAlign(p.CENTER, p.BASELINE);

		stateClr = [p.color(0,0,255), p.color(0,255,0), p.color(255,0,0)];
		
		//create FIFO-buffers (to be used in between stations)
		//maximum buffer capacity is 100 units
		var B1 = new Buffer({p5: p, name: 'B1', capacity: 100, x: 25, y: p.height/2});
		var B2 = new Buffer({p5: p, name: 'B2', capacity: 25, x: 150, y: p.height/2-75});
		var B3 = new Buffer({p5: p, name: 'B3', capacity: 50, x: 300, y: p.height/2});
		var B4 = new Buffer({p5: p, name: 'B4', capacity: 75, x: 375, y: p.height/2});
		var B5 = new Buffer({p5: p, name: 'B5', capacity: 100, x: 550, y: p.height/2});
				
		//create a test production line
		var options = {
			p5: p,
			name: 'Testline',
			inBuf: B1,
			outBuf: B5,
			inputPeriod: 1
		};
		testLine = new Line(options);
		
		//create the stations (connect them from left to right)
		var S1 = new Station({p5: p,
			name: 'Station 1',
			pLine: testLine,
			inBuf: testLine.inBuf,
			outBuf: B2,
			tpTime: 2,
			pFail: 0.005,
			tRepair: 20,
			x: 100,
			y: p.height/2
		});
		var S2 = new Station({p5: p,
			name: 'Station 2',
			pLine: testLine,
			inBuf: B2,
			outBuf: B3,
			tpTime: 2,
			pFail: 0.01,
			tRepair: 50,
			x: 200,
			y: p.height/2
		});
		var S3 = new Station({p5: p,
			name: 'Station 3',
			pLine: testLine,
			inBuf: B3,
			outBuf: B4,
			tpTime: 4,
			pFail: 0.01,
			tRepair: 100,
			x: 300,
			y: p.height/2-75
		});		
		var S4 = new Station({p5: p,
			name: 'Station 4',
			pLine: testLine,
			inBuf: B3,
			outBuf: B4,
			tpTime: 2,
			pFail: 0.01,
			tRepair: 50,
			x: 300,
			y: p.height/2+75
		});

		var S5 = new Station({p5: p,
			name: 'Station 5',
			pLine: testLine,
			inBuf: B4,
			outBuf: testLine.outBuf,
			tpTime: 2,
			pFail: 0.001,
			tRepair: 50,
			x: 475,
			y: p.height/2
		});

		/*
		var S5 = new Station({p5: p,
			name: 'Station 5',
			pLine: testLine,
			inBuf: B4,
			outBuf: testLine.outBuf,
			tpTime: 2,
			pFail: 0.01,
			tRepair: 100,
			x: 475,
			y: p.height/2-75
		});
		
		var S6 = new Station({p5: p,
			name: 'Station 6',
			pLine: testLine,
			inBuf: B4,
			outBuf: testLine.outBuf,
			tpTime: 3,
			pFail: 0.01,
			tRepair: 200,
			x: 475,
			y: p.height/2+75
		});
		*/
		
		//stations = [S1,S2,S3,S4,S5];
		with (stations) {
			push(S1);
			push(S2);
			push(S3);
			push(S4);
			push(S5);
		}
				
		//forward linking of the stations
		S1.linkTo(S2);
		S2.linkTo(S3);
		S2.linkTo(S4);
		S3.linkTo(S5);
		S4.linkTo(S5);
		
		//S4.linkTo(S6);
		//S3.linkTo(S6);
		
		//set starting/input stations
		testLine.stations = [S1];
					
		//set start and reset button handler		
		var btnStart = p.select('#startLine').mouseClicked(function(e) {
			started = true;
		});
		var btnReset = p.select('#resetLine').mouseClicked(function(e) {
			started = false;
			testLine.reset();						
			//stations.forEach(function(obj) {obj.reset();})		
			for (var i=0; i<stations.length; i++) {
				stations[i].reset();
			}
		});
		var elm = p.select('#autoAddInput');
		elm.elt.checked = autoAddInput;
		elm.mouseClicked(function(e) {
			autoAddInput = e.srcElement.checked;
		});
		
		elm = p.select('#autoRemoveOutput');
		elm.elt.checked = autoRemoveOutput;		
		elm.mouseClicked(function(e) {
			autoRemoveOutput = e.srcElement.checked;
		});
		
		/*
		var _timer = setInterval(function() {
			testLine.update();
		}, 10);
		*/
		//p.noLoop();
	}
	
	p.draw = function() {
  	p.background(51);		
		
		//change mouse pointer
		if (testLine.inBuf.mouseInside() || testLine.outBuf.mouseInside()) {
			p.cursor(p.HAND);
		}else {
			p.cursor(p.POINTER);
		}
				
		if (started) {			
			testLine.update();
		}
		
		testLine.draw();	
		
		//output repair symbol
		if (testLine.faulty) {
			p.image(images.repair, p.width-80, 40, 50, 50);			
		}
		
		//alert sound when the production line is jammed (all buffers full)
		if (testLine.jammed) {
			if (!sounds.alert.isPlaying()) {
				//sounds.alert.setVolume(0.25);
				//sounds.alert.play();
				sounds.alert.loop(0, 1, .10, 0);
			}
		}else {
			if (sounds.alert.isPlaying())
				sounds.alert.stop();
		}				
		
		if (started) {
			/*if (autoAddInput==true && testLine.inBuf.isEmpty()) {	
				for (var i=0; i<INPUT_BATCH_SIZE; i++)
					testLine.inBuf.addItem(new Item());
			}*/
			if (autoAddInput === true) {	
				testLine.inBuf.addItem(new Item());
			}
			if (autoRemoveOutput === true && testLine.outBuf.isFull()) {
				/*for (var i=0; i<OUTPUT_BATCH_SIZE; i++)
					testLine.outBuf.removeItem();*/
				testLine.outBuf.reset();
			}			
		}
		
		p.noStroke();
		p.fill(236,0,140);
		if (testLine.jammed) {
			var y = p.height-24;
			p.textAlign(p.CENTER, p.BASELINE);
			p.text('Production line is completely jammed. Click on buffer ' + testLine.outBuf.name + ' to remove items', p.width/2, y);				
		}else {
			var y = p.height-24;
			if (testLine.inBuf.isEmpty()) {
				p.textAlign(p.CENTER, p.BASELINE);
				p.text('Input buffer ' + testLine.inBuf.name + ' is empty. Click on it to add ' + INPUT_BATCH_SIZE + ' more items.', p.width/2, y);				
				y += 14;
			}
			if (testLine.outBuf.isFull()) {
				p.textAlign(p.CENTER, p.BASELINE);
				p.text('Output buffer ' + testLine.outBuf.name + ' is full. Click on it to remove ' + OUTPUT_BATCH_SIZE + ' items.', p.width/2, y);
				y += 14;
			}			
		}
		
		//output a legend for the station states
		var x = 40, y = 55;
		
		p.textAlign(p.LEFT, p.CENTER);
		p.rectMode(p.CORNER);
		
		p.stroke(102);
		p.fill(204);
		p.rect(30, 45, 80, 60);
		
		for (var i=0; i<3; i++) {
			p.stroke(255);
			p.strokeWeight(1);
			p.fill(stateClr[i]);
			p.ellipse(x, y, 6, 6);		
			p.noStroke();
			p.fill(0);
			p.text(stateStr[i], x+10, y);			
			y += 20;
		}
	}
	
	p.mousePressed = function() {
		if (p.mouseButton !== p.LEFT) 
			return;
		
		if (testLine.inBuf.mouseInside()) {
			//add items to the production line input buffer		
			for (var i=0; i<INPUT_BATCH_SIZE; i++) {
				testLine.inBuf.addItem(new Item());			
			}			
			//started = true;
		}else if (testLine.outBuf.mouseInside()) {
			//remove items from the production line output buffer		
			for (var i=0; i<OUTPUT_BATCH_SIZE; i++) {
				testLine.outBuf.removeItem();			
			}			
		}	
	}
}

var app = new p5(sketch, 'sketchContainer');
