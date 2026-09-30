import type {FormInputErrors, FormOnyxValues} from '@components/Form/types';
import SingleFieldStep from '@components/SubStepForms/SingleFieldStep';

import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useStepFormSubmit from '@hooks/useStepFormSubmit';
import type {SubPageProps} from '@hooks/useSubPage/types';

import {appendCountryCode, formatE164PhoneNumber} from '@libs/LoginUtils';
import {getFieldRequiredErrors, isValidPhoneNumber, isValidUSPhone} from '@libs/ValidationUtils';

import {getWalletOwnerDetails} from '@pages/EnablePayments/Wallet/utils/getWalletOwnerDetails';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import INPUT_IDS from '@src/types/form/PersonalBankAccountForm';

import React from 'react';

const BANK_INFO_STEP_KEYS = INPUT_IDS.BANK_INFO_STEP;
const STEP_FIELDS = [BANK_INFO_STEP_KEYS.PHONE_NUMBER];

function PhoneNumberStep({onNext, onMove, isEditing}: SubPageProps) {
    const {translate} = useLocalize();
    const [privatePersonalDetails] = useOnyx(ONYXKEYS.PRIVATE_PERSONAL_DETAILS);
    const [personalBankAccountDraft] = useOnyx(ONYXKEYS.FORMS.PERSONAL_BANK_ACCOUNT_FORM_DRAFT);
    const [countryCode = CONST.DEFAULT_COUNTRY_CODE] = useOnyx(ONYXKEYS.COUNTRY_CODE);

    const defaultPhoneNumber = getWalletOwnerDetails(privatePersonalDetails, personalBankAccountDraft)[BANK_INFO_STEP_KEYS.PHONE_NUMBER];

    const validate = (values: FormOnyxValues<typeof ONYXKEYS.FORMS.PERSONAL_BANK_ACCOUNT_FORM>): FormInputErrors<typeof ONYXKEYS.FORMS.PERSONAL_BANK_ACCOUNT_FORM> => {
        const errors = getFieldRequiredErrors(values, STEP_FIELDS, translate);

        if (values.phoneNumber) {
            const phoneNumberWithCountryCode = appendCountryCode(values.phoneNumber, countryCode);
            const e164FormattedPhoneNumber = formatE164PhoneNumber(values.phoneNumber, countryCode);

            if (!isValidPhoneNumber(phoneNumberWithCountryCode) || !isValidUSPhone(e164FormattedPhoneNumber)) {
                errors.phoneNumber = translate('common.error.phoneNumber');
            }
        }

        return errors;
    };

    const handleSubmit = useStepFormSubmit<typeof ONYXKEYS.FORMS.PERSONAL_BANK_ACCOUNT_FORM>({
        formId: ONYXKEYS.FORMS.PERSONAL_BANK_ACCOUNT_FORM,
        fieldIds: STEP_FIELDS,
        onNext,
        shouldSaveDraft: true,
    });

    return (
        <SingleFieldStep<typeof ONYXKEYS.FORMS.PERSONAL_BANK_ACCOUNT_FORM>
            isEditing={isEditing}
            onNext={onNext}
            onMove={onMove}
            formID={ONYXKEYS.FORMS.PERSONAL_BANK_ACCOUNT_FORM}
            formTitle={translate('personalInfoStep.whatsYourPhoneNumber')}
            formDisclaimer={translate('personalInfoStep.weNeedThisToVerify')}
            validate={validate}
            onSubmit={(values) => {
                handleSubmit({...values, phoneNumber: formatE164PhoneNumber(values.phoneNumber, countryCode) ?? ''});
            }}
            shouldDelayAutoFocus
            inputId={BANK_INFO_STEP_KEYS.PHONE_NUMBER}
            inputLabel={translate('common.phoneNumber')}
            inputMode={CONST.INPUT_MODE.TEL}
            defaultValue={defaultPhoneNumber}
            enabledWhenOffline
            shouldShowPatriotActLink
            forwardedFSClass={CONST.FULLSTORY.CLASS.MASK}
        />
    );
}

export default PhoneNumberStep;
