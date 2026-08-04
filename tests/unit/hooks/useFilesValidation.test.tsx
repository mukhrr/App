import {act, renderHook} from '@testing-library/react-native';

import ComposeProviders from '@components/ComposeProviders';
import {LocaleContextProvider} from '@components/LocaleContextProvider';
import OnyxListItemProvider from '@components/OnyxListItemProvider';
import ThemeProvider from '@components/ThemeProvider';
import ThemeStylesProvider from '@components/ThemeStylesContextProvider';

import useFilesValidation from '@hooks/useFilesValidation';

import type {HeicConverterFunction} from '@libs/fileDownload/heicConverter/types';

import CONST from '@src/CONST';
import type {FileObject} from '@src/types/utils/Attachment';

import React from 'react';

import waitForBatchedUpdates from '../../utils/waitForBatchedUpdates';

// Tracks how many HEIC conversions are in flight at once. Conversion never auto-resolves here -
// the test decides when each one finishes - so the peak value observed before any resolve fires is the
// true concurrency the implementation asked for, not an artifact of how fast the mock happens to settle.
const mockConversionTracker: {active: number; max: number; pending: Array<() => void>} = {active: 0, max: 0, pending: []};

jest.mock('@libs/fileDownload/heicConverter', () => ({
    __esModule: true,
    default: jest.fn(((file, {onSuccess} = {}) => {
        mockConversionTracker.active += 1;
        mockConversionTracker.max = Math.max(mockConversionTracker.max, mockConversionTracker.active);
        mockConversionTracker.pending.push(() => {
            mockConversionTracker.active -= 1;
            onSuccess?.({...file, name: file.name?.replace(/\.heic$/i, '.jpg'), type: 'image/jpeg'});
        });
    }) as HeicConverterFunction),
}));

function ThemeProviderWithLight({children}: {children: React.ReactNode}) {
    return <ThemeProvider theme="light">{children}</ThemeProvider>;
}

function wrapper({children}: {children: React.ReactNode}) {
    return <ComposeProviders components={[ThemeProviderWithLight, ThemeStylesProvider, OnyxListItemProvider, LocaleContextProvider]}>{children}</ComposeProviders>;
}

function createHeicFile(index: number): FileObject {
    return {
        name: `photo${index}.heic`,
        type: 'image/heic',
        size: 1000,
        uri: `file:///photo${index}.heic`,
    };
}

// Flushes every conversion currently in flight, then lets their `.then` chains settle. Conversions started
// as a side effect of those resolutions (the next iteration of a sequential loop) are left pending for the
// caller to flush in a subsequent round.
async function resolveInFlightConversions() {
    const toResolve = mockConversionTracker.pending;
    mockConversionTracker.pending = [];
    toResolve.forEach((resolve) => resolve());
    await waitForBatchedUpdates();
}

describe('useFilesValidation', () => {
    beforeEach(() => {
        mockConversionTracker.active = 0;
        mockConversionTracker.max = 0;
        mockConversionTracker.pending = [];
    });

    it('converts HEIC files one at a time instead of all at once, matching CONST.API_ATTACHMENT_VALIDATIONS.MAX_FILE_LIMIT', async () => {
        const onFilesValidated = jest.fn();
        const {result} = renderHook(() => useFilesValidation(onFilesValidated), {wrapper});

        const files = Array.from({length: CONST.API_ATTACHMENT_VALIDATIONS.MAX_FILE_LIMIT}, (_, index) => createHeicFile(index));

        await act(async () => {
            result.current.validateFiles(files);
            await waitForBatchedUpdates();
        });

        // This is the crux of the bug: peak concurrency must never exceed 1, otherwise every selected HEIC
        // file starts its own native ImageManipulator conversion simultaneously.
        expect(mockConversionTracker.max).toBe(1);
        expect(mockConversionTracker.active).toBe(1);

        // Drain the remaining conversions (one becomes active per round in the fixed, sequential code).
        for (let round = 0; round < files.length && mockConversionTracker.pending.length > 0; round++) {
            // eslint-disable-next-line no-await-in-loop
            await act(async () => {
                await resolveInFlightConversions();
            });
            expect(mockConversionTracker.max).toBe(1);
        }

        expect(onFilesValidated).toHaveBeenCalledTimes(1);
        const [validatedFiles] = onFilesValidated.mock.calls.at(0) ?? [];
        expect(validatedFiles).toHaveLength(files.length);
        // Original selection order must survive despite files completing conversion sequentially.
        expect((validatedFiles as FileObject[]).map((file: FileObject) => file.name)).toStrictEqual(files.map((_, index) => `photo${index}.jpg`));
    });

    it('still converts a single HEIC file successfully', async () => {
        const onFilesValidated = jest.fn();
        const {result} = renderHook(() => useFilesValidation(onFilesValidated), {wrapper});

        await act(async () => {
            result.current.validateFiles([createHeicFile(0)]);
            await waitForBatchedUpdates();
        });

        expect(mockConversionTracker.max).toBe(1);

        await act(async () => {
            await resolveInFlightConversions();
        });

        expect(onFilesValidated).toHaveBeenCalledTimes(1);
        const [validatedFiles] = onFilesValidated.mock.calls.at(0) ?? [];
        expect(validatedFiles).toStrictEqual([expect.objectContaining({name: 'photo0.jpg'})]);
    });
});
