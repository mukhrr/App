import {getActiveExpensifyCardFeedID, getDefaultCardFeed} from '@hooks/useCardFeedsForDisplay';

import type {CardFeedForDisplay} from '@libs/CardFeedUtils';
import type {ExpensifyCardFeedEntry} from '@libs/ExpensifyCardFeedSelectorUtils';
import {buildSearchQueryJSON} from '@libs/SearchQueryUtils';
import {getSuggestedSearches} from '@libs/SearchSuggestionUtils';

import CONST from '@src/CONST';
import type {ExpensifyCardSettings, Policy} from '@src/types/onyx';

import createRandomPolicy from '../utils/collections/policies';

// Repro for https://github.com/Expensify/App/issues/104831
// "Card accruals tab shows no results even though there are unapproved expenses"

const localeCompare = (a: string, b: string) => a.localeCompare(b);

const ACCOUNT_ID = 1;

// Active workspace: the admin's eligible workspace, which has its own Expensify Card (fund 100)
const activePolicy: Policy = {
    ...createRandomPolicy(1, CONST.POLICY.TYPE.CORPORATE),
    id: 'POLICY_A',
    role: CONST.POLICY.ROLE.ADMIN,
    approvalMode: CONST.POLICY.APPROVAL_MODE.BASIC,
    areCompanyCardsEnabled: true,
    policyAccountID: 100,
};

const expensifyCardFeed: CardFeedForDisplay = {id: '100_Expensify Card', feed: 'Expensify Card' as CardFeedForDisplay['feed'], fundID: '100', name: 'Expensify Card'};
const expensifyCardPrimaryFeed: ExpensifyCardFeedEntry = {settingsKey: 'expensifyCardSettings_100', fundID: 100, settings: {} as ExpensifyCardSettings};

// Company card feed (on another eligible workspace) that holds the unapproved expenses
const companyCardFeed: CardFeedForDisplay = {id: '200_vcf', feed: 'vcf', fundID: '200', name: 'Alpha Visa'};

function getCardAccrualsFeedFilter(defaultFeedID: string | undefined, activeExpensifyCardFeedID: string | undefined): string[] {
    const {searchQuery} = getSuggestedSearches(ACCOUNT_ID, defaultFeedID, true, activeExpensifyCardFeedID)[CONST.SEARCH.SEARCH_KEYS.UNAPPROVED_CARD];
    const queryJSON = buildSearchQueryJSON(searchQuery);
    const feedFilter = queryJSON?.flatFilters.find((filter) => filter.key === CONST.SEARCH.SYNTAX_FILTER_KEYS.FEED);
    return feedFilter?.filters.map((filter) => String(filter.value)) ?? [];
}

describe('Card accruals default feed (issue 104831)', () => {
    it('includes every eligible feed that can hold unapproved card expenses', () => {
        // Given an admin whose active workspace has an Expensify Card, and whose unapproved expenses sit on a company card feed of another eligible workspace
        const defaultCardFeed = getDefaultCardFeed(['POLICY_A', 'POLICY_B'], 'POLICY_A', {POLICY_B: [companyCardFeed]}, localeCompare);
        const activeExpensifyCardFeedID = getActiveExpensifyCardFeedID(activePolicy, [expensifyCardPrimaryFeed], undefined, 100, [expensifyCardFeed]);

        // When the default Card accruals query is built
        const feeds = getCardAccrualsFeedFilter(defaultCardFeed?.id, activeExpensifyCardFeedID);
        // eslint-disable-next-line no-console
        console.log('Card accruals default feed filter:', feeds);

        // Then the query should cover the company card feed too, otherwise the page shows "Nothing to show"
        expect(feeds).toContain(companyCardFeed.id);
    });
});
