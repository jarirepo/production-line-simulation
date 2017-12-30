// Polyfills
// https://github.com/uxitten/polyfill/blob/master/string.polyfill.js
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/padStart
if (!String.prototype.padStart) {
	String.prototype.padStart = function padStart(targetLength,padString) {
			targetLength = targetLength>>0; //floor if number or convert non-number to 0;
			padString = String((typeof padString !== 'undefined' ? padString : ' '));
			if (this.length > targetLength) {
					return String(this);
			}
			else {
					targetLength = targetLength-this.length;
					if (targetLength > padString.length) {
							padString += padString.repeat(targetLength/padString.length); //append to original to ensure we are longer than needed
					}
					return padString.slice(0,targetLength) + String(this);
			}
	};
}

// import * as p5 from 'p5'
import * as $ from 'jquery'

import { Buffer } from './buffer'
import { Line } from './line'
import { Station } from './station'
import { Item } from './item'
import { Color } from './color'
import { loadImage, loadAudio } from './loaders'

const canvas = document.getElementById('simulation')
const ctx = canvas.getContext('2d')

ctx.scale(1, 1)
ctx.fillStyle = '#202020'
ctx.fillRect(0, 0, canvas.width, canvas.height)
ctx.font = '14pt Calibri'
ctx.textAlign = 'center'
ctx.textBaseline = 'bottom'

const sounds = new Map()
const images = new Map()

const stateStr = ['Waiting','Busy','Repair']
const stateClr = [
	new Color(0, 0, 255),
	new Color(0, 255, 0),
	new Color(255, 0, 0)
]

/*
images['repair'] = new Image()
images['repair'].src = 'assets/repair.png'
images['repair'].onload = (e) => {
	ctx.drawImage(e.target, 0, 0, 50, 50)
}
*/

loadImage('assets/repair.png')
.then(image => images.set('repair', image))
.catch(e => console.error(e.stack))

loadAudio('assets/alarm.wav')
.then(audio => sounds.set('alarm', audio))
.catch(e => console.error(e.stack))

// const s = document.getElementById('alarm-audio')
// s.play()

$('#alarm-audio').trigger('load', e => {
	console.log('audio loaded')
})

class Simulation {
	constructor(options) {
		this.options = options
		this.started = false
		
		// create FIFO-buffers (to be used in between stations)
		// maximum buffer capacity is 100 units
		let B1 = new Buffer({name: 'B1', capacity: 100, x: 25, y: canvas.height / 2})
		let B2 = new Buffer({name: 'B2', capacity: 25, x: 150, y: canvas.height / 2 - 75})
		let B3 = new Buffer({name: 'B3', capacity: 50, x: 300, y: canvas.height / 2})
		let B4 = new Buffer({name: 'B4', capacity: 75, x: 375, y: canvas.height / 2})
		let B5 = new Buffer({name: 'B5', capacity: 100, x: 550, y: canvas.height / 2})

		// create a test production line
		this.testLine = new Line({
				name: 'Testline',
				inBuf: B1,
				outBuf: B5,
				inputPeriod: 1
		})

		// create the stations (connect them from left to right)
		const S1 = new Station(this.testLine, {
			name: 'Station 1',
			inBuf: this.testLine.inBuf,
			outBuf: B2,
			tpTime: 2,
			pFail: 0.005,
			tRepair: 20,
			x: 100,
			y: canvas.height / 2
		})

		const S2 = new Station(this.testLine, {
			name: 'Station 2',
			inBuf: B2,
			outBuf: B3,
			tpTime: 2,
			pFail: 0.01,
			tRepair: 50,
			x: 200,
			y: canvas.height / 2
		})

		const S3 = new Station(this.testLine, {
			name: 'Station 3',
			inBuf: B3,
			outBuf: B4,
			tpTime: 4,
			pFail: 0.01,
			tRepair: 100,
			x: 300,
			y: canvas.height / 2 - 75
		})

		const S4 = new Station(this.testLine, {
			name: 'Station 4',
			inBuf: B3,
			outBuf: B4,
			tpTime: 2,
			pFail: 0.01,
			tRepair: 50,
			x: 300,
			y: canvas.height / 2 + 75
		})

		const S5 = new Station(this.testLine, {
			name: 'Station 5',
			inBuf: B4,
			outBuf: this.testLine.outBuf,
			tpTime: 2,
			pFail: 0.001,
			tRepair: 50,
			x: 475,
			y: canvas.height / 2
		})

		// let S5 = new Station({p5: p,
		// 	name: 'Station 5',
		// 	pLine: testLine,
		// 	inBuf: B4,
		// 	outBuf: testLine.outBuf,
		// 	tpTime: 2,
		// 	pFail: 0.01,
		// 	tRepair: 100,
		// 	x: 475,
		// 	y: p.height/2-75
		// });
		
		// let S6 = new Station({p5: p,
		// 	name: 'Station 6',
		// 	pLine: testLine,
		// 	inBuf: B4,
		// 	outBuf: testLine.outBuf,
		// 	tpTime: 3,
		// 	pFail: 0.01,
		// 	tRepair: 200,
		// 	x: 475,
		// 	y: p.height/2+75
		// });
		
		this.stations = [S1, S2, S3, S4, S5]

		// forward linking of the stations
		S1.linkTo(S2)
		S2.linkTo(S3)
		S2.linkTo(S4)
		S3.linkTo(S5)
		S4.linkTo(S5)
		
		// S4.linkTo(S6);
		// S3.linkTo(S6);
		
		// set starting/input stations
		this.testLine.stations = [S1]

		// precompiled messages
		this.messages = {
			jammed: `Production line is jammed. Click on buffer ${this.testLine.outBuf.name} to remove items`,
			empty: `Input buffer ${this.testLine.inBuf.name} is empty. Click on it to add ${this.options.inputBatchSize} items`,
			full: `Output buffer ${this.testLine.outBuf.name} is full. Click on it to remove ${this.options.outputBatchSize} items`
		}		
	}

	start() {
		this.started = true
	}

	reset() {
		this.started = false
		this.testLine.reset()
		this.stations.forEach(s => s.reset())
	}

	update() {
		if (!this.started) { return }
		this.testLine.update()
	}

	handleMouseInput(mou) {
		if (this.testLine.inBuf.isPointInside(mou)) {
			// add items to the production line input buffer
			for (let i = 0; i < this.options.inputBatchSize; i++) {
				this.testLine.inBuf.addItem(new Item())
			}
		}else if (this.testLine.outBuf.isPointInside(mou)) {
			// remove items from the production line output buffer		
			for (let i = 0; i < this.options.outputBatchSize; i++) {
				this.testLine.outBuf.removeItem()
			}			
		}	
	}

	render(ctx) {
		this.testLine.draw(ctx)

		// output repair symbol
		// this.testLine.faulty = true
		if (this.testLine.faulty) {
			if (images.get('repair')) [
				ctx.drawImage(images.get('repair'), ctx.canvas.width - 80, 40, 50, 50)				
			]
		}

		// alert sound when the production line is jammed (all buffers full)
		if (this.testLine.jammed) {
			$('#alarm-audio').trigger('play')
		}else {
			$('#alarm-audio').trigger('pause')
		}

		if (this.started) {
			// auto-add input and auto-remove output
			if (this.options.autoAddInput) {	
				this.testLine.inBuf.addItem(new Item())
			}
			if (this.options.autoRemoveOutput && this.testLine.outBuf.isFull()) {
				this.testLine.outBuf.reset()
			}			
		}

		// output message
		ctx.font = 'normal 12pt Calibri'		
		ctx.fillStyle = 'rgb(236,0,140)'
		ctx.textAlign = 'center'
		ctx.textBaseline = 'middle'
		let y = ctx.canvas.height - 24
	
		if (this.testLine.jammed) {
			ctx.fillText(this.messages.jammed, ctx.canvas.width / 2, y)				
		}else {
			let y = ctx.canvas.height - 24
			if (this.testLine.inBuf.isEmpty()) {
				ctx.fillText(this.messages.empty, ctx.canvas.width / 2, y)				
				y += 14
			}
			if (this.testLine.outBuf.isFull()) {
				ctx.fillText(this.messages.full, ctx.canvas.width / 2, y)
			}					
		}

		// output a legend for the station states (this could be rendered in an off-screen canvas)
		ctx.textAlign = 'left'
		ctx.textBaseline = 'middle'

		ctx.beginPath()
		ctx.strokeStyle = 'rgb(102,102,102)'
		ctx.fillStyle = 'rgb(204,204,204)'
		ctx.lineWidth = 1
		ctx.rect(30, 45, 80, 60)
		ctx.fill()
		ctx.stroke()
		
		for (let i = 0; i < 3; i++) {
			let x = 40
			let y = 55 + i * 20
			
			ctx.beginPath()
			ctx.fillStyle = stateClr[i].toString()
			ctx.strokeStyle = '#fff'		
			ctx.arc(x, y, 6, 0, 2 * Math.PI)
			ctx.fill()

			ctx.fillStyle = '#000'
			ctx.font = 'normal 12pt Calibri'
			ctx.fillText(stateStr[i], 10 + x, y)
		}
	}
}

const options = {
	autoAddInput: false,
	autoRemoveOutput: false,
	inputBatchSize: 50,
	outputBatchSize: 25
}

const sim = new Simulation(options)

const mouse = {
	x: NaN,
	y: NaN
}

// set start and reset button handlers
$('#startLine').on('click', e => {
	console.log('Production line started')
	sim.start()
})
$('#resetLine').on('click', e => {
	sim.reset()
	console.log('Production line was reset')
})
// set checkbox states and handlers
$('#autoAddInput')
.prop('checked', options.autoAddInput)
.on('click', e => {
	options.autoAddInput = e.target.checked
})
$('#autoRemoveOutput')
.prop('checked', options.autoRemoveOutput)
.on('change', e => {
	options.autoRemoveOutput = e.target.checked
})

// canvas event listeners
canvas.addEventListener('mousemove', e => {
	const rect = canvas.getBoundingClientRect()
	mouse.x = e.clientX - rect.left
	mouse.y = e.clientY - rect.top
})

canvas.addEventListener('click', e => {
	sim.handleMouseInput(mouse)
})

function animate(time = 0) {
	ctx.fillStyle = '#202020'
	ctx.fillRect(0, 0, canvas.width, canvas.height)
	// ctx.clearRect(0, 0, canvas.width, canvas.height)
	
	/*
	const msg = `X: ${mouse.x}, Y: ${mouse.y}`
	ctx.textAlign = 'left'
	ctx.fillStyle = '#ccc'
	ctx.fillText(msg, 10, 20)
	*/

	// change mouse pointer
	if (sim.testLine.inBuf.isPointInside(mouse) || sim.testLine.outBuf.isPointInside(mouse)) {
		canvas.style.cursor = 'pointer'
	}else {
		canvas.style.cursor = 'default'
	}

	sim.update()
	sim.render(ctx)
	
	requestAnimationFrame(animate)
}

animate()
