import fs from 'node:fs';
import path from 'path';
import type { Result, WorkerData, WorkerResponse } from './multi';
import bufSplit from './bufSplit';

declare var self: Worker;

const results: Result = {};
let firstRemain: Buffer;
let lastRemain: Buffer;

function parseSetLine(line: Buffer) {
	if (line.length < 5) return;

	const [name, val] = Buffer.from(line).toString('utf8').split(';');
	const num = Number(val);
	const record = results[name];
	if (!record) {
		results[name] = { count: 1, max: num, min: num, mean: num };
	} else {
		if (record.max < num) record.max = num;
		if (record.min > num) record.min = num;
		record.mean = (record.mean * record.count + num) / (record.count + 1);
		record.count++;
	}
}

self.onmessage = (event: MessageEvent<WorkerData>) => {
	const { data } = event;
	switch (data.type) {
		case 'init':
			handleInit(data);
			break;
		case 'remain':
			handleRemain(data);
			break;
	}
};

async function handleInit(data: WorkerData) {
	if (data.type !== 'init') throw 'Invalid worker data recived by handleInit';

	const reader = fs.createReadStream(path.join(process.cwd(), data.file.name), {
		start: data.file.start,
		end: data.file.end ?? Infinity,
	});

	let remain: Buffer = Buffer.from([]);
	let first = true;
	await new Promise<void>((res) => {
		reader.on('data', (chunk: Buffer) => {
			const lines = bufSplit(Buffer.concat([remain, chunk]));

			if (first) {
				first = false;
				if (data.workerType !== 'start') firstRemain = lines.shift()!;
			}
			remain = lines.pop()!;

			lines.forEach(parseSetLine);
		});
		reader.on('end', () => res());
	});

	if (data.workerType === 'end') {
		parseSetLine(remain);
	}

	if (data.workerType === 'start') {
		returns(remain);
	} else {
		lastRemain = remain;
	}
}

async function handleRemain(data: WorkerData) {
	if (data.type !== 'remain') throw 'Invalid worker data recived by handleRemain';
	parseSetLine(Buffer.concat([data.remain, firstRemain]));

	returns(lastRemain);
}

function returns(remain?: Buffer) {
	self.postMessage({ res: results, remain } satisfies WorkerResponse);
}
