import type {CardFeedForDisplay} from '@libs/CardFeedUtils';
import {getCardFeedsForDisplayPerPolicy} from '@libs/CardFeedUtils';
import {getPreferredPolicyFromExpensifyCardSettings, isCustomFeed} from '@libs/CardUtils';
import type {ExpensifyCardFeedEntry} from '@libs/ExpensifyCardFeedSelectorUtils';
import {isPaidGroupPolicy, isPolicyEligibleForCardAccruals} from '@libs/PolicyUtils';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {Policy} from '@src/types/onyx';
import type {CardFeedWithNumber} from '@src/types/onyx/CardFeeds';

import type {OnyxCollection} from 'react-native-onyx';

import {expensifyCardFeedsForDisplaySelector} from '@selectors/Card';

import useExpensifyCardFeedsForFeedSelector from './useExpensifyCardFeedsForFeedSelector';
import useFeedKeysWithAssignedCards from './useFeedKeysWithAssignedCards';
import useLocalize from './useLocalize';
import useOnyx from './useOnyx';

const eligiblePoliciesSelector = (policies: OnyxCollection<Policy>): string[] => {
    return Object.values(policies ?? {}).reduce((policiesIDs, policy) => {
        if (isPaidGroupPolicy(policy) && policy?.areCompanyCardsEnabled && policy?.pendingAction !== CONST.RED_BRICK_ROAD_PENDING_ACTION.DELETE) {
            policiesIDs.push(policy.id);
        }
        return policiesIDs;
    }, [] as string[]);
};

function getDefaultCardFeed(
    eligiblePoliciesIDsArray: string[] | undefined,
    activePolicyID: string | undefined,
    cardFeedsByPolicy: Record<string, CardFeedForDisplay[]>,
    localeCompare: (a: string, b: string) => number,
): CardFeedForDisplay | undefined {
    const eligiblePoliciesIDs = new Set(eligiblePoliciesIDsArray);

    // Prioritize the active policy if eligible
    if (activePolicyID && eligiblePoliciesIDs.has(activePolicyID)) {
        const policyCardFeeds = cardFeedsByPolicy[activePolicyID];
        if (policyCardFeeds?.length) {
            return [...policyCardFeeds].sort((a, b) => localeCompare(a.name, b.name)).at(0);
        }
    }

    // If the active policy doesn't have card feeds, use the first eligible policy that does
    for (const eligiblePolicyID of eligiblePoliciesIDs) {
        const policyCardFeeds = cardFeedsByPolicy[eligiblePolicyID];
        if (policyCardFeeds?.length) {
            return [...policyCardFeeds].sort((a, b) => localeCompare(a.name, b.name)).at(0);
        }
    }

    // Commercial feeds don't have preferred policies, so we need to include these in the list
    const commercialFeeds = Object.values(cardFeedsByPolicy)
        .flat()
        .filter((feed) => !isCustomFeed(feed.name as CardFeedWithNumber));

    return commercialFeeds.sort((a, b) => localeCompare(a.name, b.name)).at(0);
}

/**
 * Collects every card feed that can hold expenses for Card accruals, so the default query doesn't hide unapproved expenses
 * that sit on a feed other than the default one: the company feeds and the Expensify Card of each workspace eligible for
 * Card accruals, plus the active workspace's own Expensify Card. The IDs are sorted so every call site builds the same query
 * hash, which keeps the Card accruals tab highlighted.
 */
function getCardAccrualsFeedIDs(
    policies: OnyxCollection<Policy>,
    cardFeedsByPolicy: Record<string, CardFeedForDisplay[]>,
    expensifyCardFeeds: CardFeedForDisplay[] | undefined,
    activeExpensifyCardFeedID: string | undefined,
    localeCompare: (a: string, b: string) => number,
): string[] {
    const feedIDs = new Set<string>();
    if (activeExpensifyCardFeedID) {
        feedIDs.add(activeExpensifyCardFeedID);
    }

    for (const policy of Object.values(policies ?? {})) {
        if (!policy?.id || !isPolicyEligibleForCardAccruals(policy)) {
            continue;
        }

        for (const feed of cardFeedsByPolicy[policy.id] ?? []) {
            feedIDs.add(feed.id);
        }

        // A workspace's own Expensify Card feed is funded by the workspace account. Domain-funded feeds can't be matched to a
        // workspace this way, so only the active workspace's one is covered, by `activeExpensifyCardFeedID`.
        if (!policy.policyAccountID) {
            continue;
        }
        const workspaceFundID = String(policy.policyAccountID);
        for (const feed of expensifyCardFeeds ?? []) {
            if (feed.fundID === workspaceFundID) {
                feedIDs.add(feed.id);
            }
        }
    }

    return [...feedIDs].sort(localeCompare);
}

/**
 * Resolves the active workspace's own Expensify Card feed for Card accruals, returning its display-feed ID (or
 * `undefined` when the workspace isn't eligible or has no Expensify Card).
 *
 * Candidate fund IDs are tried in precedence order and the first one that maps to a display feed wins:
 *   1. the workspace's primary feed (linked via `linkedPolicyIDs`, the same rule the displayed feed list uses),
 *   2. a legacy/domain feed associated through `preferredPolicy`,
 *   3. the workspace account ID, for a domain feed that backs the account directly without `linkedPolicyIDs`.
 *
 * This mirrors the primary-feed rule rather than reusing `useExpensifyCardFeeds`: that hook matches workspace feeds
 * by a loose `settingsKey.includes(workspaceAccountID)` substring test, whereas Card accruals must line up with the
 * displayed feed list, which keys strictly on `linkedPolicyIDs` (`isFeedPrimaryForPolicy`). The two aren't a direct
 * replacement, so the resolution is kept separate here.
 */
function getActiveExpensifyCardFeedID(
    activePolicy: Policy | undefined,
    primaryFeeds: ExpensifyCardFeedEntry[],
    preferredPolicyFeedFundID: number | undefined,
    activePolicyAccountID: number | undefined,
    expensifyCardFeeds: CardFeedForDisplay[] | undefined,
): string | undefined {
    // Only override the default when the active workspace is itself eligible for Card accruals. Tab visibility is
    // OR-ed across workspaces, so without this gate an ineligible active workspace's card could hijack the feed.
    if (!isPolicyEligibleForCardAccruals(activePolicy)) {
        return undefined;
    }

    // A policy can appear in several feeds' `linkedPolicyIDs`, so sort by `fundID` to keep the selection
    // deterministic. Sorting by `name` (like `getDefaultCardFeed`) wouldn't help — every non-travel Expensify Card
    // feed shares the same `CONST.EXPENSIFY_CARD.BANK` name.
    const primaryFeedFundID = [...primaryFeeds].sort((a, b) => a.fundID - b.fundID).at(0)?.fundID;

    return [primaryFeedFundID, preferredPolicyFeedFundID, activePolicyAccountID]
        .filter((fundID): fundID is number => fundID != null)
        .map((fundID) => expensifyCardFeeds?.find((feed) => feed.fundID === String(fundID))?.id)
        .find((feedID) => !!feedID);
}

const useCardFeedsForDisplay = () => {
    const {localeCompare, translate} = useLocalize();
    const [allFeeds] = useOnyx(ONYXKEYS.COLLECTION.SHARED_NVP_PRIVATE_DOMAIN_MEMBER);
    const [allPolicies] = useOnyx(ONYXKEYS.COLLECTION.POLICY);
    const feedKeysWithCards = useFeedKeysWithAssignedCards();
    const [activePolicyID] = useOnyx(ONYXKEYS.NVP_ACTIVE_POLICY_ID);
    const [expensifyCardFeeds] = useOnyx(ONYXKEYS.DERIVED.NON_PERSONAL_AND_WORKSPACE_CARD_LIST, {selector: expensifyCardFeedsForDisplaySelector});
    // Resolve the active workspace's Expensify Card feed so Card accruals lines up with the per-policy feed list
    // built by `getCardFeedsForDisplayPerPolicy`, scoping to the active policy so we don't pull in a feed from
    // another workspace the user also belongs to. See `getActiveExpensifyCardFeedID` for the precedence rule.
    const {primaryFeeds, allFeeds: expensifyCardFeedEntries} = useExpensifyCardFeedsForFeedSelector(activePolicyID);

    const eligiblePoliciesIDsArray = eligiblePoliciesSelector(allPolicies);
    const cardFeedsByPolicy = getCardFeedsForDisplayPerPolicy(allFeeds, translate, feedKeysWithCards, allPolicies);
    const defaultCardFeed = getDefaultCardFeed(eligiblePoliciesIDsArray, activePolicyID, cardFeedsByPolicy, localeCompare);

    const activePolicy = activePolicyID ? allPolicies?.[`${ONYXKEYS.COLLECTION.POLICY}${activePolicyID}`] : undefined;
    const activePolicyAccountID = activePolicy?.policyAccountID;
    const preferredPolicyFeedFundID = activePolicyID
        ? expensifyCardFeedEntries.find((entry) => getPreferredPolicyFromExpensifyCardSettings(entry.settings)?.toUpperCase() === activePolicyID.toUpperCase())?.fundID
        : undefined;

    const activeExpensifyCardFeedID = getActiveExpensifyCardFeedID(activePolicy, primaryFeeds, preferredPolicyFeedFundID, activePolicyAccountID, expensifyCardFeeds);
    const cardAccrualsFeedIDs = getCardAccrualsFeedIDs(allPolicies, cardFeedsByPolicy, expensifyCardFeeds, activeExpensifyCardFeedID, localeCompare);

    return {defaultCardFeed, cardFeedsByPolicy, cardAccrualsFeedIDs};
};

export default useCardFeedsForDisplay;
export {getDefaultCardFeed, getActiveExpensifyCardFeedID, getCardAccrualsFeedIDs};
