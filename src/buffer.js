/**
	FIFO buffer (First In First Out)
	
	A buffer is used as temporary storage of items under production.
	A buffer can be shared between multiple stations.
	A station can have one output buffer which is the input buffer 
	to the station that follows.
	
	Buffer Properties:
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
**/

const MAX_BUFFER_CAPACITY = 100
const TWO_PI = 2 * Math.PI

export class Buffer {

	constructor(options) {
		this.name = options.name
		this.capacity = options.capacity
		this.x = options.x
		this.y = options.y
		this.radius = this._getRadius(this.capacity)
		this.items = []
		this.inStn = []	
		this.outStn = []
	}

	addItem(item) {
		//returns true if the item was inserted into the buffer
		if (this.items.length < this.capacity) {
			this.items.push(item)
			return true
		}else {	
			return false
		}
	}
	
	removeItem() {
		// removes an item from the buffer according to the FIFO principle
		// if there are no items to be removed the returned value is undefined
		return this.items.shift()
	}

	isFull() {
		return this.items.length === this.capacity
	}

	isEmpty() {
		return this.items.length === 0
	}

	reset() {
		// removes all buffered items
		while (this.items.length > 0) {
			this.items.shift()
		}
	}

	draw(ctx) {

		ctx.font = '12pt Cambria'
		ctx.textAlign = 'center'
		ctx.textBaseline = 'middle'

		/*
		const w = ctx.measureText(this.name).width
		const h = 30
		const x0 = ctx.canvas.width / 2
		const y0 = 40
		*/
		
		const n = this.items.length
		const r = this._getRadius(n)

		// draw circle indicating a full buffer
		ctx.beginPath()
		ctx.lineWidth = 1
		ctx.fillStyle = 'rgba(0,0,0,0.5)'
		ctx.strokeStyle = 'rgb(102,102,102)'
		ctx.ellipse(this.x, this.y, 2 * this.radius, 2 * this.radius, 0, 0, TWO_PI)
		ctx.fill()
		ctx.stroke()

		// circle indicating the actual number of items in the buffer
		ctx.beginPath()
		ctx.fillStyle = 'rgb(0,91,127)'
		if (!this.isFull()) {
			ctx.strokeStyle = '#fff'
		}else {
			ctx.strokeStyle = '#ff0000'
		}
		ctx.ellipse(this.x, this.y, 2 * r, 2 * r, 0, 0, TWO_PI)
		ctx.fill()
		ctx.stroke()

		// buffer label
		ctx.fillStyle = '#fff'
		ctx.fillText(this.name, this.x, this.y)
	}

	isPointInside(p) {
		const dx = this.x - p.x
		const dy = this.y - p.y
		return Math.sqrt(dx * dx + dy * dy) < this.radius
	}

	_getRadius(n) {
		return Math.sqrt(this._getArea(n) / Math.PI)		
	}

	_getArea(n) {
		return 200 + 800 * n / MAX_BUFFER_CAPACITY
	}	
}
