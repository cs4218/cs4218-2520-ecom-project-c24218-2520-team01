import { test, expect } from '@playwright/test';

// Written by Nicholas Cheng, A0269648H

test.describe.configure({ mode: 'parallel' });

test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/');
});

test.describe("Checkout Flow", () => {
    test('Users who are not authenticated should not be able to checkout', async ({ page }) => {
        // Login to an account
        await page.getByRole('link', { name: 'Login' }).click();
        await page.getByRole('textbox', { name: 'Enter Your Email' }).click();
        await page.getByRole('textbox', { name: 'Enter Your Email' }).fill('admin@gmail.com');
        await page.getByRole('textbox', { name: 'Enter Your Password' }).click();
        await page.getByRole('textbox', { name: 'Enter Your Password' }).fill('Password');
        await page.getByRole('button', { name: 'LOGIN' }).click();

        // Simulate adding an item to cart
        await page.getByRole('button', { name: 'ADD TO CART' }).first().click();

        // Move to the cart page
        await page.getByRole('link', { name: 'Cart' }).click();
        // We should see an checkout or make payment button since we are currently authenticated
        await expect(page.getByRole('button', { name: 'Make Payment' })).toBeVisible();

        // Logout
        await page.getByRole('button', { name: 'Admin' }).click();
        await page.getByRole('link', { name: 'Logout' }).click();

        // Move to the cart page
        await page.getByRole('link', { name: 'Cart' }).click();

        // There should also be an option to ask the unauthenticated person to login
        await expect(page.getByRole('button', { name: 'Please Login to checkout' })).toBeVisible();
        // We should not see an checkout or make payment button since we are currently not authenticated
        await expect(page.getByRole('button', { name: 'Make Payment' })).toBeHidden();
    });
})
