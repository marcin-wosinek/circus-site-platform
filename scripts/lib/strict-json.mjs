// Parses JSON while rejecting objects that declare the same key twice.
// `JSON.parse` silently keeps only the last occurrence, which would let a
// malformed or hand-edited artifact silently drop a field.
export function parseJsonNoDuplicateKeys(text, { label = 'JSON' } = {}) {
	let value;
	try {
		value = JSON.parse(text);
	} catch (error) {
		throw new Error(`Invalid ${label}: ${error.message}`);
	}
	assertNoDuplicateKeys(text, label);
	return value;
}

function assertNoDuplicateKeys(text, label) {
	const contextStack = [];
	const keySetStack = [];
	let expectKey = false;
	let index = 0;
	const length = text.length;

	while (index < length) {
		const char = text[index];

		if (char === '"') {
			const start = index;
			index += 1;
			while (index < length && text[index] !== '"') {
				index += text[index] === '\\' ? 2 : 1;
			}
			index += 1; // closing quote
			if (contextStack.at(-1) === 'object' && expectKey) {
				let lookahead = index;
				while (lookahead < length && /\s/.test(text[lookahead])) lookahead += 1;
				if (text[lookahead] === ':') {
					const key = JSON.parse(text.slice(start, index));
					const keySet = keySetStack.at(-1);
					if (keySet.has(key)) throw new Error(`Duplicate key "${key}" in ${label}.`);
					keySet.add(key);
					expectKey = false;
				}
			}
			continue;
		}

		if (char === '{') {
			contextStack.push('object');
			keySetStack.push(new Set());
			expectKey = true;
		} else if (char === '[') {
			contextStack.push('array');
			keySetStack.push(null);
			expectKey = false;
		} else if (char === '}' || char === ']') {
			contextStack.pop();
			keySetStack.pop();
			expectKey = false;
		} else if (char === ',' && contextStack.at(-1) === 'object') {
			expectKey = true;
		}

		index += 1;
	}
}
