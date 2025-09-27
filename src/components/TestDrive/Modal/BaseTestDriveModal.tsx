import React, {useEffect, useRef} from 'react';
import TestDrive from '@assets/images/test-drive.svg';
import type {FeatureTrainingModalProps} from '@components/FeatureTrainingModal';
import FeatureTrainingModal from '@components/FeatureTrainingModal';
import useLocalize from '@hooks/useLocalize';
import useResponsiveLayout from '@hooks/useResponsiveLayout';
import useThemeStyles from '@hooks/useThemeStyles';
import {setOnboardingTestDriveModalDismissed} from '@libs/actions/Welcome';
import Navigation from '@libs/Navigation/Navigation';
import CONST from '@src/CONST';

type BaseTestDriveModalProps = Pick<
    FeatureTrainingModalProps,
    | 'children'
    | 'description'
    | 'onConfirm'
    | 'shouldCloseOnConfirm'
    | 'shouldRenderHTMLDescription'
    | 'avoidKeyboard'
    | 'shouldShowConfirmationLoader'
    | 'canConfirmWhileOffline'
    | 'onHelp'
    | 'shouldCallOnHelpWhenModalHidden'
>;

function BaseTestDriveModal({
    description,
    onConfirm,
    onHelp,
    children,
    shouldCloseOnConfirm,
    shouldRenderHTMLDescription,
    avoidKeyboard,
    shouldShowConfirmationLoader,
    canConfirmWhileOffline,
    shouldCallOnHelpWhenModalHidden,
}: BaseTestDriveModalProps) {
    const styles = useThemeStyles();
    const {translate} = useLocalize();
    const {shouldUseNarrowLayout} = useResponsiveLayout();
    const hasUserInteracted = useRef(false);

    // Track user interactions to prevent auto-dismissal
    const handleConfirm = () => {
        hasUserInteracted.current = true;
        onConfirm?.();
    };

    const handleHelp = () => {
        hasUserInteracted.current = true;
        onHelp?.();
    };

    useEffect(
        () => () => {
            // On Android, when the app is closed, this callback still gets executed, and `currentRoute` is set to an empty string (`''`).
            const currentRoute = Navigation.getActiveRoute();
            if (!currentRoute) {
                return;
            }
            // Only auto-dismiss if the user hasn't interacted with the modal
            // This prevents the modal from being dismissed when the user is actively using it
            if (!hasUserInteracted.current) {
                setOnboardingTestDriveModalDismissed();
            }
        },
        [],
    );

    return (
        <FeatureTrainingModal
            image={TestDrive}
            illustrationOuterContainerStyle={styles.p0}
            illustrationAspectRatio={CONST.FEATURE_TRAINING.TEST_DRIVE_COVER_ASPECT_RATIO}
            title={translate('testDrive.modal.title')}
            description={description}
            helpText={translate('testDrive.modal.helpText')}
            confirmText={translate('testDrive.modal.confirmText')}
            onHelp={handleHelp}
            onConfirm={handleConfirm}
            modalInnerContainerStyle={styles.testDriveModalContainer(shouldUseNarrowLayout)}
            contentInnerContainerStyles={styles.gap2}
            shouldCloseOnConfirm={shouldCloseOnConfirm}
            shouldRenderHTMLDescription={shouldRenderHTMLDescription}
            avoidKeyboard={avoidKeyboard}
            shouldShowConfirmationLoader={shouldShowConfirmationLoader}
            shouldUseScrollView
            canConfirmWhileOffline={canConfirmWhileOffline}
            shouldCallOnHelpWhenModalHidden={shouldCallOnHelpWhenModalHidden}
        >
            {children}
        </FeatureTrainingModal>
    );
}

BaseTestDriveModal.displayName = 'BaseTestDriveModal';

export default BaseTestDriveModal;
