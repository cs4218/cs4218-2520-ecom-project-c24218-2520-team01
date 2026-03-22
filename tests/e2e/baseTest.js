import { test as base } from '@playwright/test';
import setup from './setup.js';
import teardown from './teardown.js';

// Lim Jia Wei, A0277381W

// Localizes setup and teardown to the E2E folder so they do not interfere with developers' UI tests

/**
* AI Usage Declaration
*
* Tool Used: Gemini 3 Flash
*
* Prompt: How do I separate my setup and teardown code from global setup and teardown for Playwright E2E tests so future PRs do not use them
*
* How the AI Output Was Used:
* - Used some of the AI output as reference to develop the code below
*/

export const test = base.extend({

    setupOnce: [async ({ }, use) => {
        console.log('[baseTest.js] Running setup...');
        await setup();

        await use();

        console.log('[baseTest.js] Running teardown...');
        await teardown();
    }, { scope: 'worker', auto: true }],
});

export { expect } from '@playwright/test';
