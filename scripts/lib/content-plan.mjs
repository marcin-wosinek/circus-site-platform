import { createHash } from 'node:crypto';
import { stableStringify } from './page-normalization.mjs';
import { CliError } from './cli-error.mjs';

const sha = /^[a-f0-9]{64}$/;
const commitSha = /^[a-f0-9]{40}$/;
function exact(value, keys, label) {
	if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).sort().join() !== [...keys].sort().join()) throw new CliError(`Invalid ${label} fields in saved plan.`);
}

export function validatePlanRecord(record, { siteId, destination, commit, contentKeys }) {
	exact(record, ['schemaVersion', 'siteId', 'destination', 'commit', 'generatedAt', 'items', 'planHash'], 'plan');
	if (record.schemaVersion !== 2 || record.siteId !== siteId || record.commit !== commit || !commitSha.test(record.commit) || !Number.isFinite(Date.parse(record.generatedAt))) throw new CliError('Saved plan version, site, or commit does not match. Regenerate the plan.');
	exact(record.destination, ['productionUrl', 'sshTarget', 'sshPort', 'remotePath'], 'destination');
	if (stableStringify(record.destination) !== stableStringify(destination)) throw new CliError('Production destination has changed since planning.');
	if (!record.items || Object.keys(record.items).sort().join() !== [...contentKeys].sort().join()) throw new CliError('Saved plan items do not match selected configuration.');
	for (const [key, item] of Object.entries(record.items)) {
		exact(item, ['artifact', 'production', 'classification', 'reason'], `item ${key}`);
		exact(item.artifact, ['baselineHash', 'targetHash'], `artifact ${key}`);
		exact(item.production, ['postId', 'hash'], `production ${key}`);
		if ((item.artifact.baselineHash !== null && !sha.test(item.artifact.baselineHash)) || !sha.test(item.artifact.targetHash) || (item.production.hash !== null && !sha.test(item.production.hash)) || (item.production.postId !== null && !/^[1-9]\d*$/.test(String(item.production.postId))) || !['create', 'update', 'unchanged', 'conflict'].includes(item.classification) || (item.reason !== null && typeof item.reason !== 'string')) throw new CliError(`Invalid saved plan item ${key}.`);
		if ((item.production.postId === null) !== (item.production.hash === null)) throw new CliError(`Invalid saved production state for ${key}.`);
	}
	if (!sha.test(record.planHash) || computePlanHash(Object.fromEntries(Object.entries(record).filter(([key]) => key !== 'planHash'))) !== record.planHash) throw new CliError('Saved plan hash mismatch.');
	return record;
}

// Resolves which production post (if any) corresponds to a content key,
// purely from identity-marker matches and, for the front page only, the
// first-adoption fallback. Never touches a hash; classification against the
// artifact's baseline/target hashes happens separately in `classifyByHash`
// once the caller has fetched the matched post's current state.
export function resolveProductionMatch({ markerMatches, contentKey, selectorType, frontPage, pathMatches = [], markerAtPath = true }) {
	if (markerMatches.length > 1) {
		return {
			outcome: 'conflict',
			reason: `Ambiguous identity marker: ${markerMatches.length} production posts carry content key "${contentKey}".`,
		};
	}

	if (markerMatches.length === 1) {
		const [match] = markerMatches;
		if ((selectorType === 'page_path' || selectorType === 'post_path') && (!markerAtPath || pathMatches.some((pathMatch) => pathMatch.id !== match.id))) {
			return { outcome: 'conflict', reason: `Identity marker post (ID ${match.id}) does not own the configured production path.` };
		}
		if (match.status === 'trash') {
			return {
				outcome: 'conflict',
				reason: `Identity marker found on a trashed production post (ID ${match.id}).`,
			};
		}
		return { outcome: 'matched', postId: match.id };
	}

	if (selectorType === 'page_on_front') {
		if (!frontPage?.id) return { outcome: 'create' };
		if (frontPage.contentKey && frontPage.contentKey !== contentKey) {
			return {
				outcome: 'conflict',
				reason: `Production front page (ID ${frontPage.id}) already carries content key "${frontPage.contentKey}".`,
			};
		}
		return { outcome: 'matched', postId: frontPage.id };
	}
	if (selectorType === 'page_path' || selectorType === 'post_path') {
		if (pathMatches.length > 1) return { outcome: 'conflict', reason: `Ambiguous production path: ${pathMatches.length} posts match the configured path.` };
		if (pathMatches.length === 1) {
			const [match] = pathMatches;
			if (match.status === 'trash') return { outcome: 'conflict', reason: `Configured path belongs to a trashed production post (ID ${match.id}).` };
			if (match.contentKey && match.contentKey !== contentKey) return { outcome: 'conflict', reason: `Configured path belongs to content key "${match.contentKey}" (ID ${match.id}).` };
			return { outcome: 'matched', postId: match.id };
		}
	}

	return { outcome: 'create' };
}

// Classifies a resolved production match against the artifact's recorded
// baseline and target hashes.
export function classifyByHash({ baselineHash, targetHash, productionHash }) {
	if (productionHash === targetHash) return { classification: 'unchanged' };
	if (productionHash === baselineHash) return { classification: 'update' };
	return {
		classification: 'conflict',
		reason: 'Production content has drifted from both the recorded baseline and the target state.',
	};
}

export function computePlanHash(record) {
	return createHash('sha256').update(stableStringify(record)).digest('hex');
}
