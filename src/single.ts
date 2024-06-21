const file = Bun.file('./measurements.txt');
const reader = file.stream().getReader();

console.log('fsize', file.size);

const results: Record<string, { count: number; max: number; min: number; mean: number }> = {};
function parseSetLine(line: string) {
	const [name, val] = line.split(';');
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

let chunk = await reader.read();
let remain = '';

let linesRead = 0;

while (chunk.value) {
	const value = remain + Buffer.from(chunk.value).toString();
	remain = '';
	const lines = value.split('\n');
	remain = lines.pop()!;

	lines.forEach((line) => {
		parseSetLine(line);
		linesRead++;
		if (linesRead % 10_000_000 === 0) {
			console.log(linesRead, 'completed');
			console.log(`In: ${(Bun.nanoseconds() / 1_000_000_000).toFixed(3)}s`);
		}
	});

	chunk = await reader.read();
}

if (remain) parseSetLine(remain);

const cityResults: string[] = [];
Object.keys(results)
	.toSorted()
	.forEach((key) => {
		const { max, min, mean } = results[key];
		cityResults.push(key + '=' + min.toFixed(1) + '/' + mean.toFixed(1) + '/' + max.toFixed(1));
	});
console.log('{' + cityResults.join(', ') + '}');
