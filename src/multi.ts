export type WorkerData =
	| {
			type: 'init';
			workerType: 'start' | 'mid' | 'end';
			file: { name: string; start: number; end?: number };
	  }
	| { type: 'remain'; remain: Buffer };
export type Result = Record<string, { count: number; max: number; min: number; mean: number }>;
export type WorkerResponse = { res: Result; remain?: Buffer; content?: string };

const WORKER_THREADS = 10;
const FILE = './measurements.txt';

const bytes = Math.floor(Bun.file(FILE).size / WORKER_THREADS);

const workers: Worker[] = [];
const promises: Promise<WorkerResponse>[] = [];

for (let i = 0; i < WORKER_THREADS; i++) {
	const isStart = i === 0;
	const isEnd = i === WORKER_THREADS - 1;

	const worker = new Worker(new URL('multiWorker.ts', import.meta.url));
	const promise = new Promise<WorkerResponse>((res) => {
		worker.onmessage = (message: MessageEvent<WorkerResponse>) => {
			res(message.data);
		};
	});
	worker.postMessage({
		type: 'init',
		workerType: isStart ? 'start' : isEnd ? 'end' : 'mid',
		file: { name: FILE, start: bytes * i, end: isEnd ? undefined : bytes * (i + 1) - 1 },
	} satisfies WorkerData);

	workers.push(worker);
	promises.push(promise);
}

const results: Result = {};

for (let i = 0; i < WORKER_THREADS; i++) {
	const { res, remain } = await promises[i];
	workers[i].terminate();

	for (const key in res) {
		const here = results[key];
		const there = res[key];
		if (here) {
			here.max = Math.max(here.max, there.max);
			here.min = Math.min(here.min, there.min);
			here.mean = (here.mean * here.count + there.mean * there.count) / (here.count + there.count);
		} else {
			results[key] = there;
		}
	}

	if (i !== WORKER_THREADS - 1) {
		workers[i + 1].postMessage({ type: 'remain', remain: remain! } satisfies WorkerData);
	}
}

const cityResults: string[] = [];
Object.keys(results)
	.toSorted()
	.forEach((key) => {
		const { max, min, mean } = results[key];
		cityResults.push(key + '=' + min.toFixed(1) + '/' + mean.toFixed(1) + '/' + max.toFixed(1));
	});
console.log('{' + cityResults.join(', ') + '}');
