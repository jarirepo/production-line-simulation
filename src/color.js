export class Color {
	constructor(r, g, b) {
		this.r = r
		this.g = g
		this.b = b
	}
	toString() {
		return `rgb(${this.r},${this.g},${this.b})`
	}
}
