import { expect, test, type Page } from '@playwright/test'

/**
 * Walks the product's core loop end to end:
 * calendar → day → post → review, plus sharing into owner review mode.
 */

/** The demo month is fixed, so step there regardless of today's date. */
async function gotoAugust2026(page: Page) {
  const title = page.getByRole('heading', { level: 2 })
  for (let i = 0; i < 36; i++) {
    const current = (await title.textContent()) ?? ''
    if (current.includes('August 2026')) return
    const behind = new Date(`${current} 1`) < new Date('August 1 2026')
    await page.getByRole('button', { name: behind ? 'Next month' : 'Previous month' }).click()
  }
  throw new Error('could not reach August 2026')
}

/**
 * Opens the day modal. Clicking a day's empty background works, but on a busy
 * day the cell is full of posts (and clicking one opens that post instead), so
 * prefer the "+N more" affordance when it is present. Waits for the grid to
 * settle first — events re-render asynchronously after a month change.
 */
async function openDay(page: Page, date: string) {
  const cell = page.locator(`.fc-daygrid-day[data-date="${date}"]`)
  await expect(cell).toBeVisible()
  await page.waitForTimeout(300)

  const more = cell.locator('.fc-daygrid-more-link')
  if (await more.count()) {
    await more.click()
  } else {
    // The day-number strip is the one band of a cell that never holds a post.
    await cell.click({ position: { x: 30, y: 8 } })
  }
  await expect(page.getByRole('dialog')).toContainText('posts planned')
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await gotoAugust2026(page)
})

test('calendar is the hero of the first screen', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Content Calendar' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 2 })).toContainText('August 2026')
  await expect(page.locator('.fc-daygrid-body')).toBeVisible()
  expect(await page.locator('.fc-event').count()).toBeGreaterThan(20)
})

test('clicking a day opens its posts, and a post opens full details', async ({ page }) => {
  await openDay(page, '2026-08-21')

  const dayModal = page.getByRole('dialog')
  await expect(dayModal).toContainText('August 21, 2026')
  await expect(dayModal).toContainText('5 posts planned')

  // The demo review scenario: same day, three different review states.
  await expect(dayModal).toContainText('In Review')
  await expect(dayModal).toContainText('Approved')
  await expect(dayModal).toContainText('Changes Requested')

  await dayModal.getByText('Behind The Scenes').click()

  const drawer = page.getByRole('dialog').filter({ hasText: 'Behind The Scenes' })
  await expect(drawer.getByText('Please use the second version of the video.')).toBeVisible()
})

test('clicking an empty day offers to plan it', async ({ page }) => {
  await openDay(page, '2026-08-09')
  const dialog = page.getByRole('dialog')
  await expect(dialog).toContainText('0 posts planned')
  await expect(dialog).toContainText('Nothing planned for this day yet.')
})

test('owner can request changes from the shared review link', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])

  await page.getByRole('button', { name: 'Share Calendar' }).click()
  const input = page.getByRole('dialog').getByRole('textbox')
  await expect(input).toHaveValue(/\/share\//, { timeout: 15_000 })
  const shareUrl = await input.inputValue()

  await page.goto(shareUrl)

  // Review mode: no dashboard navigation, no authoring controls.
  await expect(page.getByText('Review mode')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Analytics' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Share Calendar' })).toHaveCount(0)

  await openDay(page, '2026-08-21')
  await page.getByRole('dialog').getByText('Live Webinar Teaser').click()

  const drawer = page.getByRole('dialog').filter({ hasText: 'Live Webinar Teaser' })
  await drawer.getByRole('button', { name: 'Request changes' }).click()
  await drawer.getByRole('textbox').fill('Please push this to 9am instead.')
  await drawer.getByRole('button', { name: 'Send feedback' }).click()

  await expect(page.getByText('Feedback sent — changes requested')).toBeVisible()
  await expect(drawer.getByText('Please push this to 9am instead.')).toBeVisible()
  await expect(drawer.getByText('Changes Requested').first()).toBeVisible()
})

test('search and platform filters narrow the calendar', async ({ page }) => {
  // Let the month finish rendering before taking the baseline count.
  await expect.poll(() => page.locator('.fc-event').count()).toBeGreaterThan(20)
  const before = await page.locator('.fc-event').count()

  await page.getByRole('searchbox').fill('Live Webinar Teaser')
  await expect(page.locator('.fc-event')).toHaveCount(1)

  // Search spans topic too, so a campaign term matches more than one post.
  // Poll rather than read once — the search input is debounced.
  await page.getByRole('searchbox').fill('Back to School')
  await expect.poll(() => page.locator('.fc-event').count()).toBeGreaterThan(1)

  await page.getByRole('searchbox').fill('')
  await expect(page.locator('.fc-event')).toHaveCount(before)

  await page.getByRole('button', { name: 'Platforms' }).click()
  await page.getByRole('button', { name: 'YouTube', exact: true }).click()
  const filtered = await page.locator('.fc-event').count()
  expect(filtered).toBeGreaterThan(0)
  expect(filtered).toBeLessThan(before)
})

test('a new post appears on the calendar', async ({ page }) => {
  await page.getByRole('button', { name: 'Add post' }).first().click()

  const editor = page.getByRole('dialog')
  await editor.getByLabel('Title').fill('Playwright Launch Post')
  await editor.getByLabel('Date').fill('2026-08-09')
  await editor.getByLabel('Time').fill('09:00')
  await editor.getByRole('checkbox', { name: 'Instagram' }).click()
  await editor.getByRole('button', { name: 'Create post' }).click()

  await expect(page.getByText('Post created')).toBeVisible()
  await expect(page.locator('.fc-daygrid-day[data-date="2026-08-09"]')).toContainText(
    'Playwright Launch Post',
  )
})

test('a post can be rescheduled by dragging it to another day', async ({ page }) => {
  const source = page.locator('.fc-daygrid-day[data-date="2026-08-05"] .fc-event').first()
  await expect(source).toContainText('Enrolment Closes Friday')

  await source.dragTo(page.locator('.fc-daygrid-day[data-date="2026-08-06"] .fc-daygrid-day-frame'))

  await expect(page.getByText(/Rescheduled to/)).toBeVisible()
  await expect(page.locator('.fc-daygrid-day[data-date="2026-08-06"]')).toContainText(
    'Enrolment Closes Friday',
  )
})

test('switching to the Dr. Wael tab shows an empty, separate calendar', async ({ page }) => {
  await expect.poll(() => page.locator('.fc-event').count()).toBeGreaterThan(20)

  await page.getByRole('tab', { name: 'Dr. Wael' }).click()

  await expect(page.locator('.fc-event')).toHaveCount(0)
  await expect(page.getByText('Back to School Campaign')).toHaveCount(0)

  // Switching back returns to the full Wonderlearn calendar, untouched.
  await page.getByRole('tab', { name: 'Wonderlearn' }).click()
  await expect.poll(() => page.locator('.fc-event').count()).toBeGreaterThan(20)
})

test('a new post under Dr. Wael defaults to LinkedIn but other platforms stay pickable', async ({
  page,
}) => {
  await page.getByRole('tab', { name: 'Dr. Wael' }).click()
  await page.getByRole('button', { name: 'Add post' }).first().click()

  const editor = page.getByRole('dialog')
  await expect(editor.getByRole('checkbox', { name: 'LinkedIn' })).toHaveAttribute(
    'aria-checked',
    'true',
  )
  await expect(editor.getByRole('checkbox', { name: 'Instagram' })).toHaveAttribute(
    'aria-checked',
    'false',
  )

  await editor.getByLabel('Title').fill('Dr. Wael Launch Post')
  await editor.getByLabel('Date').fill('2026-08-09')
  await editor.getByLabel('Time').fill('09:00')
  await editor.getByRole('button', { name: 'Create post' }).click()

  await expect(page.getByText('Post created')).toBeVisible()
  await expect(page.locator('.fc-daygrid-day[data-date="2026-08-09"]')).toContainText(
    'Dr. Wael Launch Post',
  )

  // And it never leaks back into Wonderlearn's calendar.
  await page.getByRole('tab', { name: 'Wonderlearn' }).click()
  await expect(page.getByText('Dr. Wael Launch Post')).toHaveCount(0)
})
