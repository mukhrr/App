import {isMoneyRequestReport} from '@libs/ReportUtils';

import Navigation from '@navigation/Navigation';

import ONYXKEYS from '@src/ONYXKEYS';

import {useIsFocused} from '@react-navigation/native';
import {useEffect, useRef} from 'react';

import useOnyx from './useOnyx';
import usePrevious from './usePrevious';

/** How long a money request report must stay absent before its disappearance counts as a removal. */
const CONFIRM_REMOVAL_DELAY_MS = 2000;

/**
 * Dismisses the modal when a money request report is removed (e.g. deleted or merged).
 * Skips dismissal during route changes — the new report's data may not be loaded yet,
 * so the absent `report` should not be interpreted as removal.
 */
function useDismissOnMoneyRequestReportRemoval(reportIDFromRoute: string | undefined) {
    const [report] = useOnyx(`${ONYXKEYS.COLLECTION.REPORT}${reportIDFromRoute}`);
    const prevReport = usePrevious(report);
    const prevReportIDFromRoute = usePrevious(reportIDFromRoute);
    const isFocused = useIsFocused();
    const firstRenderRef = useRef(true);

    useEffect(() => {
        if (firstRenderRef.current) {
            firstRenderRef.current = false;
            return;
        }

        if (prevReportIDFromRoute !== reportIDFromRoute) {
            return;
        }

        const isRemovalExpectedForReportType = !report && isMoneyRequestReport(prevReport);

        if (isRemovalExpectedForReportType) {
            if (!isFocused) {
                return;
            }
            // A boot snapshot can replace the report collection and make the report vanish for a moment, which is
            // not a removal. Confirm it stays gone before dismissing: if it comes back this effect re-runs and
            // clears the timeout, so a cold deep link is no longer bounced back to Home.
            const timeoutID = setTimeout(() => Navigation.dismissModal(), CONFIRM_REMOVAL_DELAY_MS);
            return () => clearTimeout(timeoutID);
        }
    }, [report, isFocused, prevReport, prevReportIDFromRoute, reportIDFromRoute]);
}

export default useDismissOnMoneyRequestReportRemoval;
