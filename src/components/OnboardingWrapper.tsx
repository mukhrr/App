import useThemeStyles from '@hooks/useThemeStyles';

import React, {useContext, useState} from 'react';

import FocusTrapContainerElement from './FocusTrap/FocusTrapContainerElement';
import FocusTrapForScreens from './FocusTrap/FocusTrapForScreen';
import {OnboardingStickyHeaderContainerContext} from './OnboardingStickyHeader';

type OnboardingWrapperProps = {
    children: React.ReactNode;
};

function OnboardingWrapper({children}: OnboardingWrapperProps) {
    const styles = useThemeStyles();
    const headerContainerElement = useContext(OnboardingStickyHeaderContainerContext);
    const [contentContainerElement, setContentContainerElement] = useState<HTMLElement | null>(null);

    // The back caret is drawn outside the step card, so the step's focus trap has to span both containers to keep it tabbable.
    const containerElements = [contentContainerElement, headerContainerElement].filter((element) => !!element);

    return (
        <FocusTrapForScreens focusTrapSettings={{containerElements}}>
            <FocusTrapContainerElement
                onContainerElementChanged={setContentContainerElement}
                style={styles.h100}
            >
                {children}
            </FocusTrapContainerElement>
        </FocusTrapForScreens>
    );
}

export default OnboardingWrapper;
