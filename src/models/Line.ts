import { Item } from './Item';
import { Station, StationState } from './Station';

const zeroPad = (value: number, n: number) => {
	// return value.toString().padStart(n, '0');
	return value;
}

// this.name = options.name
// this.inBuf = options.inBuf
// this.outBuf = options.outBuf
// this.inputPeriod = options.inputPeriod

interface LineOptions {
	name: string;
	inBuf: any;
	outBuf: any;
	inputPeriod: number;
}

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
**/
export class Line {
	readonly name: string = this.options.name;
	readonly inBuf = this.options.inBuf;
	readonly outBuf = this.options.outBuf;
	readonly inputPeriod = this.options.inputPeriod;
	
	stations: Station[] = [];
	timeStep: number = 0;
	producedItems: number = 0;
	productivity: number = 0;
	jammed: boolean = false;
	faulty: boolean = false;	
	_timer: number = NaN;
	/** Productivity */
	readonly Q: number[] = [];

	constructor(readonly options: LineOptions) {}
	
	getTime(): number {
		return this.timeStep;
	}
	
	start(): void {
		this._timer = setInterval(() => {
			//code
		}, this.inputPeriod);
	}
	
	stop(): void {
		clearInterval(this._timer);
		this._timer = NaN;
	}

	reset(): void {
		this.stop();
		this.timeStep = 0;
		this.producedItems = 0;
		this.productivity = 0;
		this.inBuf.reset();
		this.outBuf.reset();
	}
	
	update(): void {
		// update the state of the production line by backward propagation,
		// starting with the last station(s)
		this.timeStep++;
		
		if (0 && this.timeStep % this.inputPeriod == 0) {			
			this.inBuf.addItem(new Item());
		}

		// set station updated flag to false
		for (let i = 0; i < this.outBuf.inStn.length; i++) {			
			const obj = this.outBuf.inStn[i];
			this.resetUpdate(obj);
		}

		let n0 = this.outBuf.items.length;
		
		// start backward propagation algorithm
		this.faulty = false;
		this.jammed = true;
		for (let i = 0; i < this.outBuf.inStn.length; i++) {			
			let obj = this.outBuf.inStn[i];
			this.updater(obj);
		}

		let n1 = this.outBuf.items.length;
		
		this.producedItems += (n1 - n0);

		// calculate productivity
		this.productivity = this.producedItems / this.timeStep * 60 * 60;

		if (this.Q.length >= 500) {
			this.Q.shift();
		}
		this.Q.push(this.productivity);

		//auto-remove item from the line output buffer
		//producedItems = this.outBuf.items.length;
		//if (true) {
			//producedItems += this.outBuf.items.length;
			//this.outBuf.reset();					
		//}
	}

	updater(s: Station): void {
		// recursive update of stations
		if (s) {
			s.update(this.timeStep);
			if (s.state === StationState.REPAIR) {
				this.faulty = true;
			}
			this.jammed = this.jammed && (s.inBuf.isFull() && s.outBuf.isFull())
			for (let i = 0; i < s.prevStations.length; i++) {
				let obj = s.prevStations[i];
				this.updater(obj);
			}
		}
	}
	
	resetUpdate(s: Station): void {		
		if (s) {
			s.updated = false;
			for (let i = 0; i < s.prevStations.length; i++) {
				let obj = s.prevStations[i];
				this.resetUpdate(obj);
			}
		}
	}
	

	draw(ctx: CanvasRenderingContext2D): void {
		// draws the complete production line
		let xmin = this.inBuf.x,
				xmax = this.outBuf.x;

		ctx.fillStyle = '#000';
		ctx.strokeStyle = '#fff';
		ctx.fillRect(xmin, 40, xmax - xmin, ctx.canvas.height - 80);
		ctx.strokeRect(xmin, 40, xmax - xmin, ctx.canvas.height - 80);
		
		ctx.font = '14pt Calibri';
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';	
		
		const w = ctx.measureText(this.name).width;
		const h = 30;
		const x0 = ctx.canvas.width / 2;
		const y0 = 40;

		ctx.fillRect((ctx.canvas.width - 2 * w) / 2, y0 - h / 2, 2 * w, h);
		ctx.strokeRect((ctx.canvas.width - 2 * w) / 2, y0 - h / 2, 2 * w, h);
		ctx.fillStyle = 'rgb(200,200,50)';
		ctx.fillText(this.name, x0, y0);

		// output the productivity, Q
		if (this.Q.length > 1) {
			ctx.beginPath();
			ctx.lineWidth = 2;
			ctx.strokeStyle = 'rgb(172,211,115)';
			ctx.moveTo(40, ctx.canvas.height - 10 - 0.2 * this.Q[0]);
			for (let i = 1; i < this.Q.length; i++) {
				ctx.lineTo(40 + i, ctx.canvas.height - 10 - 0.2 * this.Q[i]);
			}
			ctx.stroke();
		}

		// draw the input and output buffers
		this.inBuf.draw(ctx);
		this.outBuf.draw(ctx);

		// draw the connections and stations
		for (let s of this.stations) {
			this._drawConnections(ctx, s);
			this._drawStation(ctx, s);
		}

		// output stats
		ctx.beginPath();
		ctx.fillStyle = 'rgb(51,51,51)';
		ctx.rect(0, 0, ctx.canvas.width, 25);
		ctx.fill();

		ctx.fillStyle = '#fff';
		ctx.font = '12pt Cambria';
		ctx.textAlign = 'left';
		ctx.textBaseline = 'bottom';

		ctx.fillText(`Time step: ${zeroPad(this.timeStep, 5)}`, 5, 24);
		ctx.fillText(`Input: ${zeroPad(this.inBuf.items.length, 3)}`, 130, 24);
		ctx.fillText(`Output: ${zeroPad(this.outBuf.items.length, 3)}`, 215, 24);
		ctx.fillText(`Productivity: ${this.productivity | 0} units/min`, 310, 24);
	}
		
	_drawConnections(ctx: CanvasRenderingContext2D, s: Station): void {
		if (!s) { return }
		// draw connection from station S to the in/out buffers;
		// we want the lines to appear behind the stations and buffers in order to not disrubt the station and buffer labels
		ctx.beginPath();
		ctx.lineWidth = 1;
		ctx.strokeStyle = 'rgb(192,192,192)';
		ctx.moveTo(s.x, s.y);
		ctx.lineTo(s.inBuf.x, s.inBuf.y);
		ctx.moveTo(s.x, s.y);
		ctx.lineTo(s.outBuf.x, s.outBuf.y);
		ctx.stroke();

		s.nextStations.forEach(obj => {
			ctx.beginPath();
			ctx.moveTo(s.x, s.y);
			ctx.lineTo(obj.x, obj.y);
			ctx.stroke();
			this._drawConnections(ctx, obj);
		})
	}

	private _drawStation(ctx: CanvasRenderingContext2D, s: Station): void {
		// draws subsequent stations recursively			
		if (!s) { return }
		s.nextStations.forEach(obj => {
			this._drawStation(ctx, obj);
		});
		s.draw(ctx);
		s.inBuf.draw(ctx);
		s.outBuf.draw(ctx);
	}
}
