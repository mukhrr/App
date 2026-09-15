import useSafeAreaPaddings from '@hooks/useSafeAreaPaddings';
import useThemeStyles from '@hooks/useThemeStyles';
import useViewportOffsetTop from '@hooks/useViewportOffsetTop';

import type {ReactNode} from 'react';

import React, {createContext, useState} from 'react';
import {View} from 'react-native';

import type {CaretBackHeaderProps} from './CaretBackHeader';

import CaretBackHeader from './CaretBackHeader';
import CollapsibleHeaderOnKeyboard from './CollapsibleHeaderOnKeyboard';
import FocusTrapContainerElement from './FocusTrap/FocusTrapContainerElement';

type OnboardingStickyHeaderConfig = CaretBackHeaderProps & {
    /** Collapse the caret together with the step's own header when the landscape keyboard leaves no room for an input */
    shouldCollapseOnKeyboard?: boolean;
};

type OnboardingStickyHeaderProps = {
    children: ReactNode;
};

const OnboardingStickyHeaderActionsContext = createContext<(config: OnboardingStickyHeaderConfig) => void>(() => {});

/** The caret's DOM container, so a step's focus trap can include it (web only) */
const OnboardingStickyHeaderContainerContext = createContext<HTMLElement | null>(null);

/**
 * Draws one back caret on top of the onboarding stack, outside the animated cards, so it never slides with a step
 * transition. Steps keep reserving the caret's space inside their own ScreenWrapper (see OnboardingHeader), which
 * leaves every screen's safe-area and keyboard-avoiding layout exactly as it was.
 */
function OnboardingStickyHeader({children}: OnboardingStickyHeaderProps) {
    const styles = useThemeStyles();
    const {paddingTop} = useSafeAreaPaddings();
    const viewportOffsetTop = useViewportOffsetTop();
    const [config, setConfig] = useState<OnboardingStickyHeaderConfig>({shouldShowBackButton: false});
    const [headerContainerElement, setHeaderContainerElement] = useState<HTMLElement | null>(null);

    return (
        <OnboardingStickyHeaderActionsContext.Provider value={setConfig}>
            <OnboardingStickyHeaderContainerContext.Provider value={headerContainerElement}>
                <View style={styles.flex1}>
                    {children}
                    <View
                        style={[styles.pAbsolute, styles.t0, styles.l0, styles.r0, {paddingTop, marginTop: viewportOffsetTop}]}
                        pointerEvents="box-none"
                    >
                        <CollapsibleHeaderOnKeyboard
                            enabled={!!config.shouldCollapseOnKeyboard}
                            alwaysCollapseHeaderOnKeyboard
                        >
                            <FocusTrapContainerElement
                                onContainerElementChanged={setHeaderContainerElement}
                                pointerEvents="box-none"
                            >
                                <CaretBackHeader
                                    shouldShowBackButton={config.shouldShowBackButton}
                                    onBackButtonPress={config.onBackButtonPress}
                                />
                            </FocusTrapContainerElement>
                        </CollapsibleHeaderOnKeyboard>
                    </View>
                </View>
            </OnboardingStickyHeaderContainerContext.Provider>
        </OnboardingStickyHeaderActionsContext.Provider>
    );
}

export default OnboardingStickyHeader;
export {OnboardingStickyHeaderActionsContext, OnboardingStickyHeaderContainerContext};
export type {OnboardingStickyHeaderConfig};
