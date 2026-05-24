import React from 'react';
import BaseWidgetItem from '@components/BaseWidgetItem';
import {useMemoizedLazyExpensifyIcons} from '@hooks/useLazyAsset';
import useLocalize from '@hooks/useLocalize';
import useTheme from '@hooks/useTheme';
import Navigation from '@libs/Navigation/Navigation';
import ROUTES from '@src/ROUTES';

type EnterSignerInfoProps = {
    /** ID of the bank account awaiting signer info */
    bankAccountID: string;

    /** Last four digits of the bank account number */
    bankAccountLastFour: string;

    /** ID of the workspace policy the bank account belongs to */
    policyID: string;
};

function EnterSignerInfo({bankAccountID, bankAccountLastFour, policyID}: EnterSignerInfoProps) {
    const theme = useTheme();
    const {translate} = useLocalize();
    const icons = useMemoizedLazyExpensifyIcons(['Bank']);

    return (
        <BaseWidgetItem
            icon={icons.Bank}
            iconBackgroundColor={theme.widgetIconBG}
            iconFill={theme.widgetIconFill}
            title={translate('homePage.timeSensitiveSection.enterSignerInfo.title')}
            subtitle={translate('homePage.timeSensitiveSection.enterSignerInfo.subtitle', {bankAccountLastFour})}
            ctaText={translate('homePage.timeSensitiveSection.enterSignerInfo.cta')}
            onCtaPress={() => Navigation.navigate(ROUTES.BANK_ACCOUNT_ENTER_SIGNER_INFO.getRoute(policyID, bankAccountID, false))}
            buttonProps={{success: true}}
        />
    );
}

export default EnterSignerInfo;
