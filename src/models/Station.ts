import { Buffer } from './Buffer';
import { Color } from './Color';
import { Item } from './Item';
import { Line } from './Line';

const COLOR_WAITING = new Color(0, 0, 200);
const COLOR_BUSY = new Color(0, 200, 0);
const COLOR_REPAIR = new Color(200, 0, 0);

export enum StationState {
	WAITING,
	BUSY,
	REPAIR
}

interface StationOptions {
	name: string;
	inBuf: Buffer;
	outBuf: Buffer;
	tpTime: number;
	pFail: number;
	tRepair: number;
	x: number;
	y: number;
}

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
export class Station {

	readonly name: string = this.options.name;
	readonly pLine: Line = this.line;
	readonly inBuf: Buffer = this.options.inBuf;
	readonly outBuf: Buffer = this.options.outBuf;
	readonly tpTime: number = this.options.tpTime;
	readonly pFail: number = this.options.pFail;
	readonly tRepair: number = this.options.tRepair;
	readonly x: number = this.options.x;
	readonly y: number = this.options.y;

	readonly prevStations: Station[] = [];
	readonly nextStations: Station[] = [];

	state: StationState = StationState.WAITING;
	tStart: number = NaN;
	tStop: number = NaN;
	tProd: number = 0;
	tWait: number = 0;
	nFail: number = 0;
	item: Item = null;
	updated: boolean = false;

	constructor(readonly line: Line, readonly options: StationOptions) {	
		if (this.inBuf) {
			this.inBuf.outStn.push(this);
		}
		if (this.outBuf) {
			this.outBuf.inStn.push(this);
		}
	}

	reset(): void {
		console.log(`Reset station ${this.name}`);
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
	
	linkTo(stationAfter: Station): void {
		// creates a bi-directional link between this and the next station 
		// console.log('Linking %s with %s', this.name, stationAfter.name);
		this.nextStations.push(stationAfter);
		stationAfter.prevStations.push(this);
	}
	
	update(t: number): void {
		//let t = this.pLine.getTime();
		if (this.updated) { return; }
	
		switch (this.state) {
			case StationState.WAITING:
				this.tWait++;
				// get an item from the input buffer (if anything there)
				let item = this.inBuf.removeItem();
				if (item !== undefined) {
					this.state = StationState.BUSY;
					this.tStart = t;
					this.item = item;
				}
				break;
			
			case StationState.BUSY:
				// check if task is completed
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
							// console.log('Failure in ' + this.name);
						} else {
							// this.state = StationState.WAITING;						
							// this.tStart = t;
							// get an item from the input buffer (if anything there)
							let item = this.inBuf.removeItem();
							if (item !== undefined) {
								this.state = StationState.BUSY;
								this.tStart = t;
								this.item = item;
							}						
						}
					} else {
						//remain in busy state
						this.tWait++;
					}
				}
				break;

			case StationState.REPAIR:
				// check if repair is completed
				if (t - this.tStart >= this.tRepair) {
					this.tWait += this.tRepair;
					//get an item from the input buffer (if anything there)
					let item = this.inBuf.removeItem();
					if (item !== undefined) {
						this.state = StationState.BUSY;
						this.tStart = t;
						this.item = item;
					} else {
						//remain in a waiting state
						this.state = StationState.WAITING;
					}			
				} else {
					this.tWait++;
				}
				break;
			
			default:
				break;
		}
		
		this.updated = true;
	}

	draw(ctx: CanvasRenderingContext2D): void {
		ctx.font = 'normal 12pt Calibri';

		const w = ctx.measureText(this.name).width * 1.5;
		const h = 25 * 1.5;

		ctx.beginPath();
		ctx.fillStyle = 'rgb(102,102,102)';
		ctx.strokeStyle = '#fff';
		ctx.lineWidth = 1;
		ctx.rect(this.x - w / 2, this.y - h / 2, w, h);
		ctx.fill();
		ctx.stroke();

		// station label
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillStyle = '#fff';
		ctx.fillText(this.name, this.x, this.y);

		// state indicator (filled circle depending on the state)
		let clr;
		switch (this.state) {
			case StationState.WAITING:
				clr = 'rgb(0,0,200)';
				break;
			case StationState.BUSY:
				clr = 'rgb(0,200,0)';
				break;
			case StationState.REPAIR:
				clr = 'rgb(200,0,0)';
				break;
		}
		ctx.beginPath();
		ctx.fillStyle = clr;
		ctx.arc(this.x + w / 2 - 6, this.y - h / 2 + 6, 3, 0, 2 * Math.PI);
		ctx.fill();
	}
}
