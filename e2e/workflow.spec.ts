import { expect, test, type Page } from '@playwright/test'

/**
 * The manager dashboard now sits behind a real login (Supabase Auth), and
 * the database starts empty for both workspaces — there's no fixed seed
 * dataset to assert against anymore. Tests that need to be signed in read
 * the key from E2E_LOGIN_KEY and skip gracefully if it isn't set, rather
 * than hardcoding a real production credential into a committed file.
 * Anything a test creates, it deletes before finishing.
 */

const loginKey = process.env.E2E_LOGIN_KEY

async function login(page: Page) {
  await page.goto('/')
  await page.getByLabel('Access key').fill(loginKey!)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('heading', { name: 'Content Calendar' })).toBeVisible()
}

test('the manager dashboard requires signing in', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByLabel('Access key')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Content Calendar' })).toHaveCount(0)
})

test('an invalid key is rejected', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Access key').fill('not-a-real-key')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByText("doesn't match either account")).toBeVisible()
})

test('the public share page never asks for a login', async ({ page }) => {
  // A share id that can't possibly resolve still renders the "invalid link"
  // page, not a login wall — proving /share/:id is outside the auth guard.
  await page.goto('/share/does-not-exist')
  await expect(page.getByLabel('Access key')).toHaveCount(0)
  await expect(page.getByText("This link isn't valid")).toBeVisible()
})

test.describe('signed in', () => {
  test.skip(!loginKey, 'set E2E_LOGIN_KEY to run authenticated flows')

  test('both workspaces start empty, and creating a post is self-contained', async ({ page }) => {
    await login(page)

    await expect(page.locator('.fc-event')).toHaveCount(0)
    await page.getByRole('tab', { name: 'Dr. Wael' }).click()
    await expect(page.locator('.fc-event')).toHaveCount(0)
    await page.getByRole('tab', { name: 'Wonderlearn' }).click()

    const title = `Playwright smoke test ${Date.now()}`
    await page.getByRole('button', { name: 'Add post' }).first().click()
    const editor = page.getByRole('dialog')
    await editor.getByLabel('Title').fill(title)
    await editor.getByLabel('Date').fill('2026-08-09')
    await editor.getByLabel('Time').fill('09:00')
    await editor.getByRole('checkbox', { name: 'Instagram' }).click()
    await editor.getByRole('button', { name: 'Create post' }).click()
    await expect(page.getByText('Post created')).toBeVisible()
    await expect(page.locator('.fc-daygrid-day[data-date="2026-08-09"]')).toContainText(title)

    // Clean up — this runs against the real project, so leave nothing behind.
    await page.locator('.fc-daygrid-day[data-date="2026-08-09"] .fc-event').first().click()
    await page.getByRole('button', { name: 'More actions' }).click()
    await page.getByRole('menuitem', { name: 'Delete' }).click()
    await page.getByRole('button', { name: 'Delete', exact: true }).click()
    await expect(page.getByText('Post deleted')).toBeVisible()
    await expect(page.locator('.fc-daygrid-day[data-date="2026-08-09"]')).not.toContainText(title)
  })
})
