export class Item {
	readonly id = Math.floor(1e6 * Math.random());
	readonly created = new Date().getTime();

	constructor() {}
}
