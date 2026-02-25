import { test, expect } from '@playwright/test';

test('Workflow Builder - Basic Interactions', async ({ page }) => {
    // 1. Navigate to the app (adjust path if needed)
    await page.goto('/');

    // 2. Navigate to a workflow (this part depends on how workflows are listed)
    // Assuming there's a list and we click on one
    await page.click('text=BPM Manager'); // Just an example

    // 3. Wait for the canvas to load
    const canvas = page.locator('section').filter({ hasText: 'Lienzo Vacío' }).or(page.locator('section').filter({ hasText: 'Modelador' }));
    await expect(canvas).toBeVisible();

    // 4. Verify Panning Container
    const container = page.locator('section');
    await expect(container).toHaveClass(/cursor-crosshair/);

    // 5. Test "Conectar" button state
    const connectBtn = page.getByTitle('Conectar Actividades');
    await expect(connectBtn).toBeDisabled();

    // 6. Select an activity (if any exists)
    // Note: For a robust test, we should drag a new activity from the toolbox first
    const activityTool = page.getByText('Tarea', { exact: true });
    const dropZone = page.locator('section');

    await activityTool.dragTo(dropZone);

    // 7. Click the new activity
    const node = page.locator('div').filter({ hasText: 'Nueva Tarea' }).first();
    await node.click();

    // 8. Verify "Conectar" is now enabled
    await expect(connectBtn).toBeEnabled();
});
