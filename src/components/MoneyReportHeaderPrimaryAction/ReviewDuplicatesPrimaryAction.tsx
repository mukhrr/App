import Button from '@components/ButtonComposed';

import useCurrentUserPersonalDetails from '@hooks/useCurrentUserPersonalDetails';
import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useTransactionsAndViolationsForReport from '@hooks/useTransactionsAndViolationsForReport';

import getNonEmptyStringOnyxID from '@libs/getNonEmptyStringOnyxID';
import {getThreadReportIDsForTransactions} from '@libs/MoneyRequestReportUtils';
import createDynamicRoute from '@libs/Navigation/helpers/dynamicRoutesUtils/createDynamicRoute';
import Navigation from '@libs/Navigation/Navigation';
import {getIOUActionForReportID} from '@libs/ReportActionsUtils';
import {getReportOrDraftReport} from '@libs/ReportUtils';
import {isDuplicate} from '@libs/TransactionUtils';

import {createTransactionThreadReport} from '@userActions/Report';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import {DYNAMIC_ROUTES} from '@src/ROUTES';
import {personalDetailsLoginSelector} from '@src/selectors/PersonalDetails';

import React from 'react';

import type {SimpleActionProps} from './types';

import useTransactionThreadData from './useTransactionThreadData';

function ReviewDuplicatesPrimaryAction({reportID, chatReportID}: SimpleActionProps) {
    const {translate} = useLocalize();
    const {accountID, email} = useCurrentUserPersonalDetails();

    const {moneyRequestReport, reportActions, transactionThreadReportID, isOffline} = useTransactionThreadData(reportID, chatReportID);
    const [policy] = useOnyx(`${ONYXKEYS.COLLECTION.POLICY}${getNonEmptyStringOnyxID(moneyRequestReport?.policyID)}`);
    const [introSelected] = useOnyx(ONYXKEYS.NVP_INTRO_SELECTED);
    const [betas] = useOnyx(ONYXKEYS.BETAS);
    const [allTransactionViolations] = useOnyx(ONYXKEYS.COLLECTION.TRANSACTION_VIOLATIONS);
    const [ownerLogin] = useOnyx(ONYXKEYS.PERSONAL_DETAILS_LIST, {selector: personalDetailsLoginSelector(moneyRequestReport?.ownerAccountID)});

    const {transactions: reportTransactionsMap} = useTransactionsAndViolationsForReport(moneyRequestReport?.reportID);
    const transactions = Object.values(reportTransactionsMap);

    return (
        <Button
            variant={CONST.BUTTON_VARIANT.SUCCESS}
            onPress={() => {
                let threadID: string | undefined | null = transactionThreadReportID;
                if (!threadID) {
                    const duplicateTransaction = transactions.find((reportTransaction) =>
                        isDuplicate(
                            reportTransaction,
                            email ?? '',
                            accountID,
                            moneyRequestReport,
                            ownerLogin,
                            policy,
                            allTransactionViolations?.[ONYXKEYS.COLLECTION.TRANSACTION_VIOLATIONS + reportTransaction.transactionID],
                        ),
                    );
                    if (duplicateTransaction) {
                        const existingThreadID = getThreadReportIDsForTransactions(reportActions, [duplicateTransaction]).at(0);
                        // Offline the thread report can never be fetched, so seed it locally under its known ID. Without this
                        // the review flow lands on a report it has no copy of and every page reading the thread shows "Not here".
                        const shouldSeedUncachedThread = !!existingThreadID && isOffline && !getReportOrDraftReport(existingThreadID)?.reportID;
                        if (existingThreadID && !shouldSeedUncachedThread) {
                            threadID = existingThreadID;
                        } else {
                            const transactionID = duplicateTransaction.transactionID;
                            const iouAction = getIOUActionForReportID(moneyRequestReport?.reportID, transactionID);
                            const createdTransactionThreadReport = createTransactionThreadReport({
                                introSelected,
                                currentUserLogin: email ?? '',
                                currentUserAccountID: accountID,
                                betas,
                                iouReport: moneyRequestReport,
                                iouReportAction: iouAction,
                                knownTransactionThreadReportID: existingThreadID,
                            });
                            threadID = createdTransactionThreadReport?.reportID ?? existingThreadID;
                        }
                    }
                }
                if (threadID) {
                    Navigation.navigate(createDynamicRoute(DYNAMIC_ROUTES.TRANSACTION_DUPLICATE_REVIEW.getRoute(threadID)));
                }
            }}
        >
            <Button.Text>{translate('iou.reviewDuplicates')}</Button.Text>
        </Button>
    );
}

export default ReviewDuplicatesPrimaryAction;
