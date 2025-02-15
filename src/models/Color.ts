export class Color {

	constructor(readonly r: number, readonly g: number, readonly b: number) {}
	
	toString() {
		return `rgb(${this.r},${this.g},${this.b})`;
	}
}
