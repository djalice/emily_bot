"use strict";

const toml = require('toml');
const {promisify} = require('util');
const fs = require('fs');
const readFileAsync = promisify(fs.readFile);

var moment = new require('moment');

var count = new Array();
var date = null;

function Counter() {
}

Counter.setDate = function(d) {
	date = d;
}

Counter.increment = function(id) {
	if(typeof count[id] === "undefined") {
		count[id] = 0;
	}

	count[id] += 1;
}

Counter.save = function() {
	let data = "";
	for(let key in count) {
		data += `${key} = ${count[key]}\n`;
	}

	let fname = date + ".toml";
	if(!fs.existsSync("./Counter")) {
		fs.mkdirSync("./Counter");
	}
	fs.writeFileSync("./Counter/" + fname, data);
}

Counter.load = function() {
	let fname = date + ".toml";
	readFileAsync("./Counter/" + fname)
	.then(obj => {
		data = toml.parse(obj); // TOMLパーズ
		for(let key in data) {
			count[key] = data[key];
		}

		Console.dir(count);
	}).catch(err => {
	});
}

Counter.reset = function() {
	count = new Array();
}

module.exports = Counter;