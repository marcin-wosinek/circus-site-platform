import { createHash } from 'node:crypto';
import { stableStringify } from './page-normalization.mjs';

// Resolves which production post (if any) corresponds to a content key,
// purely from identity-marker matches and, for the front page only, the
// first-adoption fallback. Never touches a hash; classification against the
// artifact's baseline/target hashes happens separately in `classifyByHash`
// once the caller has fetched the matched post's current state.
export function resolveProductionMatch({ markerMatches, contentKey, selectorType, frontPage }) {
	if (markerMatches.length > 1) {
		return {
			outcome: 'conflict',
			reason: `Ambiguous identity marker: ${markerMatches.length} production posts carry content key "${contentKey}".`,
		};
	}

	if (markerMatches.length === 1) {
		const [match] = markerMatches;
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
