import {getActiveExpensifyCardFeedID, getCardAccrualsFeedIDs, getDefaultCardFeed} from '@hooks/useCardFeedsForDisplay';

import type {CardFeedForDisplay} from '@libs/CardFeedUtils';
import type {ExpensifyCardFeedEntry} from '@libs/ExpensifyCardFeedSelectorUtils';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {ExpensifyCardSettings, Policy} from '@src/types/onyx';

import type {OnyxCollection} from 'react-native-onyx';

import createRandomPolicy from '../utils/collections/policies';

const localeCompare = (a: string, b: string) => a.localeCompare(b);

const customFeedA: CardFeedForDisplay = {id: '1_vcf', feed: 'vcf', fundID: '1', name: 'Alpha Visa'};
const customFeedB: CardFeedForDisplay = {id: '1_cdf', feed: 'cdf', fundID: '1', name: 'Beta MasterCard'};
const commercialFeed: CardFeedForDisplay = {id: '2_oauth.chase.com', feed: 'oauth.chase.com' as CardFeedForDisplay['feed'], fundID: '2', name: 'Chase'};
const commercialFeedZ: CardFeedForDisplay = {id: '3_stripe', feed: 'stripe' as CardFeedForDisplay['feed'], fundID: '3', name: 'Stripe'};

describe('getDefaultCardFeed', () => {
    it('returns the alphabetically first feed from the active policy when it is eligible', () => {
        const cardFeedsByPolicy: Record<string, CardFeedForDisplay[]> = {
            POLICY_1: [customFeedB, customFeedA],
        };
        const result = getDefaultCardFeed(['POLICY_1'], 'POLICY_1', cardFeedsByPolicy, localeCompare);
        expect(result).toEqual(customFeedA);
    });

    it('falls back to the first eligible policy with feeds when the active policy has none', () => {
        const cardFeedsByPolicy: Record<string, CardFeedForDisplay[]> = {
            POLICY_2: [customFeedB, customFeedA],
        };
        const result = getDefaultCardFeed(['POLICY_1', 'POLICY_2'], 'POLICY_1', cardFeedsByPolicy, localeCompare);
        expect(result).toEqual(customFeedA);
    });

    it('falls back to commercial feeds when no eligible policy has feeds', () => {
        const cardFeedsByPolicy: Record<string, CardFeedForDisplay[]> = {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            '': [commercialFeedZ, commercialFeed],
        };
        const result = getDefaultCardFeed(['POLICY_1'], 'POLICY_1', cardFeedsByPolicy, localeCompare);
        expect(result).toEqual(commercialFeed);
    });

    it('skips the active policy when it is not eligible and uses the first eligible policy instead', () => {
        const cardFeedsByPolicy: Record<string, CardFeedForDisplay[]> = {
            POLICY_1: [customFeedB],
            POLICY_2: [customFeedA],
        };
        // POLICY_1 is active but not in the eligible list
        const result = getDefaultCardFeed(['POLICY_2'], 'POLICY_1', cardFeedsByPolicy, localeCompare);
        expect(result).toEqual(customFeedA);
    });

    it('returns undefined when there are no feeds at all', () => {
        const result = getDefaultCardFeed([], undefined, {}, localeCompare);
        expect(result).toBeUndefined();
    });

    it('returns undefined when eligiblePoliciesIDsArray is undefined', () => {
        const result = getDefaultCardFeed(undefined, undefined, {}, localeCompare);
        expect(result).toBeUndefined();
    });

    it('prefers active policy feed over other eligible policies', () => {
        const cardFeedsByPolicy: Record<string, CardFeedForDisplay[]> = {
            POLICY_1: [customFeedB],
            POLICY_2: [customFeedA],
        };
        const result = getDefaultCardFeed(['POLICY_1', 'POLICY_2'], 'POLICY_1', cardFeedsByPolicy, localeCompare);
        expect(result).toEqual(customFeedB);
    });
});

describe('getActiveExpensifyCardFeedID', () => {
    // Minimal eligible active workspace: paid group, admin/auditor role, non-optional approval mode.
    const eligiblePolicy: Policy = {
        ...createRandomPolicy(1, CONST.POLICY.TYPE.TEAM),
        role: CONST.POLICY.ROLE.ADMIN,
        approvalMode: CONST.POLICY.APPROVAL_MODE.BASIC,
        policyAccountID: 900,
    };

    // The resolver only reads `fundID` off each entry.
    const primaryFeed = (fundID: number): ExpensifyCardFeedEntry => ({settingsKey: `expensifyCardSettings_${fundID}`, fundID, settings: {} as ExpensifyCardSettings});

    // Display feeds carry a string `fundID` and the `id` the resolver returns.
    const expensifyFeed = (fundID: string): CardFeedForDisplay => ({id: `${fundID}_Expensify Card`, feed: 'Expensify Card' as CardFeedForDisplay['feed'], fundID, name: 'Expensify Card'});

    describe('precedence', () => {
        it('prefers the primary feed over the preferred-policy fund and the workspace account', () => {
            const feeds = [expensifyFeed('100'), expensifyFeed('200'), expensifyFeed('900')];
            const result = getActiveExpensifyCardFeedID(eligiblePolicy, [primaryFeed(100)], 200, 900, feeds);
            expect(result).toBe('100_Expensify Card');
        });

        it('falls back to the preferred-policy fund when there is no primary feed', () => {
            const feeds = [expensifyFeed('200'), expensifyFeed('900')];
            const result = getActiveExpensifyCardFeedID(eligiblePolicy, [], 200, 900, feeds);
            expect(result).toBe('200_Expensify Card');
        });

        it('falls back to the workspace account ID when no primary or preferred-policy feed maps', () => {
            const feeds = [expensifyFeed('900')];
            const result = getActiveExpensifyCardFeedID(eligiblePolicy, [], undefined, 900, feeds);
            expect(result).toBe('900_Expensify Card');
        });

        it('skips a candidate fund that has no matching display feed and uses the next candidate', () => {
            // Primary fund 100 has no display feed, so resolution falls through to the preferred-policy fund 200.
            const feeds = [expensifyFeed('200')];
            const result = getActiveExpensifyCardFeedID(eligiblePolicy, [primaryFeed(100)], 200, 900, feeds);
            expect(result).toBe('200_Expensify Card');
        });

        it('picks the lowest fundID deterministically when the policy has multiple primary feeds', () => {
            const feeds = [expensifyFeed('300'), expensifyFeed('100'), expensifyFeed('200')];
            const result = getActiveExpensifyCardFeedID(eligiblePolicy, [primaryFeed(300), primaryFeed(100), primaryFeed(200)], undefined, undefined, feeds);
            expect(result).toBe('100_Expensify Card');
        });

        it('resolves the feed for an auditor on an eligible workspace', () => {
            const feeds = [expensifyFeed('100')];
            const auditorPolicy: Policy = {...eligiblePolicy, role: CONST.POLICY.ROLE.AUDITOR};
            expect(getActiveExpensifyCardFeedID(auditorPolicy, [primaryFeed(100)], undefined, undefined, feeds)).toBe('100_Expensify Card');
        });

        it('resolves the workspace account feed for a card admin on an eligible workspace', () => {
            // Given a card admin, whose admin-only feed selector lists no primary feed, on a workspace with its own Expensify Card
            const feeds = [expensifyFeed('900')];
            const cardAdminPolicy: Policy = {...eligiblePolicy, role: CONST.POLICY.ROLE.CARD_ADMIN};

            // When the active Expensify Card feed is resolved
            const result = getActiveExpensifyCardFeedID(cardAdminPolicy, [], undefined, 900, feeds);

            // Then Card accruals opens on the workspace's own feed, because the role reads every report and the card pages
            expect(result).toBe('900_Expensify Card');
        });

        it('returns undefined when the eligible workspace has no matching Expensify Card feed', () => {
            const feeds = [expensifyFeed('999')];
            const result = getActiveExpensifyCardFeedID(eligiblePolicy, [primaryFeed(100)], 200, 900, feeds);
            expect(result).toBeUndefined();
        });
    });

    describe('eligibility gate', () => {
        it('returns undefined when the active policy role is not admin, auditor, or card admin', () => {
            const feeds = [expensifyFeed('100')];
            const memberPolicy: Policy = {...eligiblePolicy, role: CONST.POLICY.ROLE.USER};
            expect(getActiveExpensifyCardFeedID(memberPolicy, [primaryFeed(100)], undefined, undefined, feeds)).toBeUndefined();
        });

        it('returns undefined when the active policy approval mode is optional', () => {
            const feeds = [expensifyFeed('100')];
            const optionalPolicy: Policy = {...eligiblePolicy, approvalMode: CONST.POLICY.APPROVAL_MODE.OPTIONAL};
            expect(getActiveExpensifyCardFeedID(optionalPolicy, [primaryFeed(100)], undefined, undefined, feeds)).toBeUndefined();
        });

        it('returns undefined when the active policy is not a paid group policy', () => {
            const feeds = [expensifyFeed('100')];
            const personalPolicy: Policy = {...eligiblePolicy, type: CONST.POLICY.TYPE.PERSONAL};
            expect(getActiveExpensifyCardFeedID(personalPolicy, [primaryFeed(100)], undefined, undefined, feeds)).toBeUndefined();
        });

        it('returns undefined when there is no active policy', () => {
            expect(getActiveExpensifyCardFeedID(undefined, [], undefined, undefined, [])).toBeUndefined();
        });
    });
});

describe('getCardAccrualsFeedIDs', () => {
    // Paid workspace with approvals where the user is an admin, so it is eligible for Card accruals
    const createEligiblePolicy = (id: string, policyAccountID: number): Policy => ({
        ...createRandomPolicy(policyAccountID, CONST.POLICY.TYPE.CORPORATE),
        id,
        role: CONST.POLICY.ROLE.ADMIN,
        approvalMode: CONST.POLICY.APPROVAL_MODE.BASIC,
        policyAccountID,
    });
    const toPolicyCollection = (policies: Policy[]): OnyxCollection<Policy> => Object.fromEntries(policies.map((policy) => [`${ONYXKEYS.COLLECTION.POLICY}${policy.id}`, policy]));
    const expensifyFeed = (fundID: string): CardFeedForDisplay => ({id: `${fundID}_Expensify Card`, feed: CONST.EXPENSIFY_CARD.BANK, fundID, name: CONST.EXPENSIFY_CARD.BANK});

    it('includes company feeds of other eligible workspaces alongside the active Expensify Card', () => {
        // Given the case from issue 104831: the active workspace has an Expensify Card, and the unapproved expenses sit on a
        // company feed of another workspace the user also administers
        const policies = toPolicyCollection([createEligiblePolicy('POLICY_A', 100), createEligiblePolicy('POLICY_B', 200)]);
        const cardFeedsByPolicy: Record<string, CardFeedForDisplay[]> = {POLICY_B: [customFeedA]};

        // When the Card accruals feeds are collected
        const result = getCardAccrualsFeedIDs(policies, cardFeedsByPolicy, [expensifyFeed('100')], '100_Expensify Card', localeCompare);

        // Then both feeds are searched, so the company feed's expenses aren't hidden behind "Nothing to show"
        expect(result).toEqual(['1_vcf', '100_Expensify Card']);
    });

    it('includes the Expensify Card of every eligible workspace, not only the active one', () => {
        // Given two eligible workspaces, each funding its own Expensify Card
        const policies = toPolicyCollection([createEligiblePolicy('POLICY_A', 100), createEligiblePolicy('POLICY_B', 200)]);

        // When the Card accruals feeds are collected with only the active workspace's card resolved
        const result = getCardAccrualsFeedIDs(policies, {}, [expensifyFeed('100'), expensifyFeed('200')], '100_Expensify Card', localeCompare);

        // Then the other workspace's card is included too
        expect(result).toEqual(['100_Expensify Card', '200_Expensify Card']);
    });

    it('leaves out feeds of workspaces that are not eligible for Card accruals', () => {
        // Given a workspace where the user is only a member, with its own company feed and Expensify Card
        const memberPolicy: Policy = {...createEligiblePolicy('POLICY_B', 200), role: CONST.POLICY.ROLE.USER};
        const policies = toPolicyCollection([createEligiblePolicy('POLICY_A', 100), memberPolicy]);
        const cardFeedsByPolicy: Record<string, CardFeedForDisplay[]> = {POLICY_A: [customFeedB], POLICY_B: [customFeedA]};

        // When the Card accruals feeds are collected
        const result = getCardAccrualsFeedIDs(policies, cardFeedsByPolicy, [expensifyFeed('100'), expensifyFeed('200')], undefined, localeCompare);

        // Then only the eligible workspace's feeds are searched, since the user can't review the other workspace's spend
        expect(result).toEqual(['1_cdf', '100_Expensify Card']);
    });

    it('returns the same sorted list whatever order the feeds arrive in', () => {
        // Given the same feeds listed in two different orders
        const policies = toPolicyCollection([createEligiblePolicy('POLICY_A', 100)]);

        // When the Card accruals feeds are collected from each
        const first = getCardAccrualsFeedIDs(policies, {POLICY_A: [customFeedB, customFeedA]}, [expensifyFeed('100')], undefined, localeCompare);
        const second = getCardAccrualsFeedIDs(policies, {POLICY_A: [customFeedA, customFeedB]}, [expensifyFeed('100')], undefined, localeCompare);

        // Then both produce the same list, so every call site builds the same query hash
        expect(first).toEqual(second);
    });

    it('returns an empty list when there are no eligible workspaces and no active Expensify Card', () => {
        // Given no workspaces
        // When the Card accruals feeds are collected
        const result = getCardAccrualsFeedIDs(undefined, {}, undefined, undefined, localeCompare);

        // Then nothing is returned and the caller falls back to the default feed
        expect(result).toEqual([]);
    });
});
