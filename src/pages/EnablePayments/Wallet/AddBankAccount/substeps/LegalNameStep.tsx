import FullNameStep from '@components/SubStepForms/FullNameStep';

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
const STEP_FIELDS = [BANK_INFO_STEP_KEYS.FIRST_NAME, BANK_INFO_STEP_KEYS.LAST_NAME];

function LegalNameStep({onNext, onMove, isEditing}: SubPageProps) {
    const {translate} = useLocalize();
    const [privatePersonalDetails] = useOnyx(ONYXKEYS.PRIVATE_PERSONAL_DETAILS);
    const [personalBankAccountDraft] = useOnyx(ONYXKEYS.FORMS.PERSONAL_BANK_ACCOUNT_FORM_DRAFT);

    const ownerDetails = getWalletOwnerDetails(privatePersonalDetails, personalBankAccountDraft);
    const defaultValues = {
        firstName: ownerDetails[BANK_INFO_STEP_KEYS.FIRST_NAME],
        lastName: ownerDetails[BANK_INFO_STEP_KEYS.LAST_NAME],
    };

    const handleSubmit = useStepFormSubmit<typeof ONYXKEYS.FORMS.PERSONAL_BANK_ACCOUNT_FORM>({
        formId: ONYXKEYS.FORMS.PERSONAL_BANK_ACCOUNT_FORM,
        fieldIds: STEP_FIELDS,
        onNext,
        shouldSaveDraft: true,
    });

    return (
        <FullNameStep<typeof ONYXKEYS.FORMS.PERSONAL_BANK_ACCOUNT_FORM>
            isEditing={isEditing}
            onNext={onNext}
            onMove={onMove}
            formID={ONYXKEYS.FORMS.PERSONAL_BANK_ACCOUNT_FORM}
            formTitle={translate('personalInfoStep.whatsYourLegalName')}
            formSubtitle={translate('personalInfoStep.legalNameSubtitle')}
            onSubmit={handleSubmit}
            stepFields={STEP_FIELDS}
            firstNameInputID={BANK_INFO_STEP_KEYS.FIRST_NAME}
            lastNameInputID={BANK_INFO_STEP_KEYS.LAST_NAME}
            defaultValues={defaultValues}
            shouldShowPatriotActLink
            forwardedFSClass={CONST.FULLSTORY.CLASS.MASK}
        />
    );
}

export default LegalNameStep;
