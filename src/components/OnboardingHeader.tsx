import useThemeStyles from '@hooks/useThemeStyles';

import {useFocusEffect} from '@react-navigation/native';
import React, {useContext, useEffect, useRef} from 'react';
import {View} from 'react-native';

import type {OnboardingStickyHeaderConfig} from './OnboardingStickyHeader';

import {OnboardingStickyHeaderActionsContext} from './OnboardingStickyHeader';

type OnboardingHeaderProps = OnboardingStickyHeaderConfig;

/**
 * Registers the focused step's back caret with OnboardingStickyHeader and reserves the caret's height inside the
 * step's own ScreenWrapper. The caret itself is drawn once above the navigator so it does not slide with the card.
 */
function OnboardingHeader({onBackButtonPress, shouldShowBackButton = true, shouldCollapseOnKeyboard = false}: OnboardingHeaderProps) {
    const styles = useThemeStyles();
    const setStickyHeaderConfig = useContext(OnboardingStickyHeaderActionsContext);

    // Steps pass a fresh inline handler on every render, so the sticky header gets a stable callback that reads the latest one.
    const onBackButtonPressRef = useRef(onBackButtonPress);
    useEffect(() => {
        onBackButtonPressRef.current = onBackButtonPress;
    }, [onBackButtonPress]);

    useFocusEffect(() => {
        setStickyHeaderConfig({
            shouldShowBackButton,
            shouldCollapseOnKeyboard,
            onBackButtonPress: () => onBackButtonPressRef.current?.(),
        });
    });

    return <View style={styles.onboardingHeaderContainer} />;
}

export default OnboardingHeader;
