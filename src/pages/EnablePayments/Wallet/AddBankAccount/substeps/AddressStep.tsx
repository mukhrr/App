import CommonAddressStep from '@components/SubStepForms/AddressStep';

import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useStepFormSubmit from '@hooks/useStepFormSubmit';
import type {SubPageProps} from '@hooks/useSubPage/types';

import {getWalletOwnerDetails} from '@pages/EnablePayments/Wallet/utils/getWalletOwnerDetails';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import INPUT_IDS from '@src/types/form/PersonalBankAccountForm';

import React from 'react';

const BANK_INFO_STEP_KEYS = INPUT_IDS.BANK_INFO_STEP;

const INPUT_KEYS = {
    street: BANK_INFO_STEP_KEYS.STREET,
    city: BANK_INFO_STEP_KEYS.CITY,
    state: BANK_INFO_STEP_KEYS.STATE,
    zipCode: BANK_INFO_STEP_KEYS.ZIP_CODE,
};

const STEP_FIELDS = [BANK_INFO_STEP_KEYS.STREET, BANK_INFO_STEP_KEYS.CITY, BANK_INFO_STEP_KEYS.STATE, BANK_INFO_STEP_KEYS.ZIP_CODE];

function AddressStep({onNext, onMove, isEditing}: SubPageProps) {
    const {translate} = useLocalize();
    const [privatePersonalDetails] = useOnyx(ONYXKEYS.PRIVATE_PERSONAL_DETAILS);
    const [personalBankAccountDraft] = useOnyx(ONYXKEYS.FORMS.PERSONAL_BANK_ACCOUNT_FORM_DRAFT);

    const ownerDetails = getWalletOwnerDetails(privatePersonalDetails, personalBankAccountDraft);
    const defaultValues = {
        street: ownerDetails[BANK_INFO_STEP_KEYS.STREET],
        city: ownerDetails[BANK_INFO_STEP_KEYS.CITY],
        state: ownerDetails[BANK_INFO_STEP_KEYS.STATE],
        zipCode: ownerDetails[BANK_INFO_STEP_KEYS.ZIP_CODE],
    };

    const handleSubmit = useStepFormSubmit<typeof ONYXKEYS.FORMS.PERSONAL_BANK_ACCOUNT_FORM>({
        formId: ONYXKEYS.FORMS.PERSONAL_BANK_ACCOUNT_FORM,
        fieldIds: STEP_FIELDS,
        onNext,
        shouldSaveDraft: true,
    });

    return (
        <CommonAddressStep<typeof ONYXKEYS.FORMS.PERSONAL_BANK_ACCOUNT_FORM>
            isEditing={isEditing}
            onNext={onNext}
            onMove={onMove}
            formID={ONYXKEYS.FORMS.PERSONAL_BANK_ACCOUNT_FORM}
            formTitle={translate('personalInfoStep.whatsYourAddress')}
            formPOBoxDisclaimer={translate('personalInfoStep.addressSubtitle')}
            onSubmit={handleSubmit}
            stepFields={STEP_FIELDS}
            inputFieldsIDs={INPUT_KEYS}
            defaultValues={defaultValues}
            shouldShowHelpLinks
            shouldShowPatriotActLink
            forwardedFSClass={CONST.FULLSTORY.CLASS.MASK}
        />
    );
}

export default AddressStep;
