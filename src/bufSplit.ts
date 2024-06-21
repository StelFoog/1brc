const lineBreak = 0x0a;

export default function bufSplit(buf: Buffer): Buffer[] {
	const buffers: Buffer[] = [];
	let start = 0;
	for (let i = 0; i < buf.length; i++) {
		const val = buf[i];
		if (val === lineBreak) {
			buffers.push(buf.subarray(start, i));
			start = i + 1;
		}
	}
	buffers.push(buf.subarray(start));

	return buffers;
}
