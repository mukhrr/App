import {useMemo} from 'react';
import useOnyx from '@hooks/useOnyx';
import {getOriginalMessage, isReimbursementDirectionInformationRequiredAction} from '@libs/ReportActionsUtils';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';

type SignerInfoRequest = {
    /** Stable key used to render this widget row */
    key: string;

    /** ID of the bank account awaiting signer info */
    bankAccountID: string;

    /** Last four digits of the bank account number */
    bankAccountLastFour: string;

    /** ID of the workspace policy the bank account belongs to */
    policyID: string;
};

function useTimeSensitiveSignerInfo() {
    const [reportActions] = useOnyx(ONYXKEYS.COLLECTION.REPORT_ACTIONS);

    const pendingSignerRequests = useMemo<SignerInfoRequest[]>(() => {
        const seen = new Set<string>();
        const items: SignerInfoRequest[] = [];

        for (const actionsForReport of Object.values(reportActions ?? {})) {
            for (const action of Object.values(actionsForReport ?? {})) {
                if (!isReimbursementDirectionInformationRequiredAction(action)) {
                    continue;
                }
                const message = getOriginalMessage<typeof CONST.REPORT.ACTIONS.TYPE.REIMBURSEMENT_DIRECTOR_INFORMATION_REQUIRED>(action);
                if (!message || message.completed || !message.bankAccountID || !message.policyID) {
                    continue;
                }
                if (seen.has(message.bankAccountID)) {
                    continue;
                }
                seen.add(message.bankAccountID);
                items.push({
                    key: `signer-${message.bankAccountID}`,
                    bankAccountID: message.bankAccountID,
                    bankAccountLastFour: message.bankAccountLastFour,
                    policyID: message.policyID,
                });
            }
        }

        return items;
    }, [reportActions]);

    // TODO TEMP: remove before commit — hardcoded for local Home tab visual test
    return {
        pendingSignerRequests: [
            {
                key: 'signer-test-1234',
                bankAccountID: '1',
                bankAccountLastFour: '1234',
                policyID: 'TESTPOLICY',
            },
        ],
    };

    return {pendingSignerRequests};
}

export default useTimeSensitiveSignerInfo;
export type {SignerInfoRequest};
