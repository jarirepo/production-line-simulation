export class Item {
	constructor() {
		this.id = Math.floor(1e6 * Math.random())
		this.created = new Date().getTime()
	}
}
