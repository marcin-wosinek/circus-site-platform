import { renameSync, writeFileSync } from 'node:fs';

export function writeJsonFile(path, value) {
	writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

// Writes atomically, so a crash mid-write cannot leave a half-written file.
export function writeJsonFileAtomic(path, value) {
	const temporaryPath = `${path}.tmp-${process.pid}`;
	writeFileSync(temporaryPath, `${JSON.stringify(value, null, 2)}\n`);
	renameSync(temporaryPath, path);
}
