import {getCurrentAddress, getStreetLines} from '@libs/PersonalDetailsUtils';

import CONST from '@src/CONST';
import type {PersonalBankAccountForm} from '@src/types/form';
import INPUT_IDS from '@src/types/form/PersonalBankAccountForm';
import type {PrivatePersonalDetails} from '@src/types/onyx';

import type {OnyxEntry} from 'react-native-onyx';

const KEYS = INPUT_IDS.BANK_INFO_STEP;

type WalletOwnerDetails = {
    [KEYS.FIRST_NAME]: string;
    [KEYS.LAST_NAME]: string;
    [KEYS.STREET]: string;
    [KEYS.STREET_SECOND]: string;
    [KEYS.CITY]: string;
    [KEYS.STATE]: string;
    [KEYS.ZIP_CODE]: string;
    [KEYS.PHONE_NUMBER]: string;
};

/**
 * Legal name, home address and phone number for the wallet bank account owner, preferring what the user entered in this flow over
 * the saved profile. The wallet flow is US-only, so a saved non-US address is not used.
 */
function getWalletOwnerDetails(privatePersonalDetails: OnyxEntry<PrivatePersonalDetails>, draft?: OnyxEntry<PersonalBankAccountForm>): WalletOwnerDetails {
    const savedAddress = getCurrentAddress(privatePersonalDetails);
    const profileAddress = !savedAddress?.country || savedAddress.country === CONST.COUNTRY.US ? savedAddress : undefined;
    const [profileStreet, profileStreet2] = getStreetLines(profileAddress?.street);
    const hasDraftAddress = !!draft?.[KEYS.STREET];

    return {
        [KEYS.FIRST_NAME]: draft?.[KEYS.FIRST_NAME] ?? privatePersonalDetails?.legalFirstName ?? '',
        [KEYS.LAST_NAME]: draft?.[KEYS.LAST_NAME] ?? privatePersonalDetails?.legalLastName ?? '',
        [KEYS.STREET]: hasDraftAddress ? (draft?.[KEYS.STREET] ?? '') : (profileStreet ?? ''),
        // The wallet address form has a single street input, so an address entered here has no second line.
        [KEYS.STREET_SECOND]: hasDraftAddress ? '' : (profileStreet2 ?? profileAddress?.street2 ?? ''),
        [KEYS.CITY]: hasDraftAddress ? (draft?.[KEYS.CITY] ?? '') : (profileAddress?.city ?? ''),
        [KEYS.STATE]: hasDraftAddress ? (draft?.[KEYS.STATE] ?? '') : (profileAddress?.state ?? ''),
        [KEYS.ZIP_CODE]: hasDraftAddress ? (draft?.[KEYS.ZIP_CODE] ?? '') : (profileAddress?.zip ?? ''),
        [KEYS.PHONE_NUMBER]: draft?.[KEYS.PHONE_NUMBER] ?? privatePersonalDetails?.phoneNumber ?? '',
    };
}

function hasWalletOwnerName(details: WalletOwnerDetails): boolean {
    return !!details[KEYS.FIRST_NAME] && !!details[KEYS.LAST_NAME];
}

function hasWalletOwnerAddress(details: WalletOwnerDetails): boolean {
    return !!details[KEYS.STREET] && !!details[KEYS.CITY] && !!details[KEYS.STATE] && !!details[KEYS.ZIP_CODE];
}

function hasWalletOwnerPhone(details: WalletOwnerDetails): boolean {
    return !!details[KEYS.PHONE_NUMBER];
}

export {getWalletOwnerDetails, hasWalletOwnerName, hasWalletOwnerAddress, hasWalletOwnerPhone};
export type {WalletOwnerDetails};
