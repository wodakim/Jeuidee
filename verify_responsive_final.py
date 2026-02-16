
import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        # Launch browser
        browser = await p.chromium.launch(headless=True)

        # --- SCENARIO 1: LANDSCAPE (Desktop/Tablet) ---
        page = await browser.new_page(viewport={'width': 1280, 'height': 720})
        await page.goto('file:///app/index.html')

        # Start Game
        await page.click('button.diet-carnivore')
        await page.wait_for_timeout(1000)

        # Force Open Editor
        await page.evaluate('window.state.player.dna = 100; window.openEditor();')
        await page.wait_for_timeout(500)

        # Take Landscape Screenshot
        await page.screenshot(path='landscape_final.png')
        print("Saved landscape_final.png")

        # Check layout: Side panels
        # In landscape, panels are flex-direction: row (default) or implicitly side-by-side in .editor-panels
        # We can check the bounding boxes.
        panels = await page.locator('.panel').all()
        box1 = await panels[0].bounding_box() # Left panel (Stats)
        box2 = await panels[1].bounding_box() # Right panel (Parts)

        # In landscape, one should be on left, one on right.
        print(f"Landscape Panel 1 X: {box1['x']}")
        print(f"Landscape Panel 2 X: {box2['x']}")

        if box1['x'] < 100 and box2['x'] > 800:
             print("PASS: Panels are side-by-side in Landscape.")
        else:
             print("WARN: Panels might not be side-by-side.")

        # --- SCENARIO 2: PORTRAIT (Mobile) ---
        # iPhone X viewport
        page_mobile = await browser.new_page(
            viewport={'width': 375, 'height': 812},
            is_mobile=True,
            has_touch=True
        )
        await page_mobile.goto('file:///app/index.html')

        # Start Game
        await page_mobile.click('button.diet-carnivore')
        await page_mobile.wait_for_timeout(1000)

        # Force Open Editor
        await page_mobile.evaluate('window.state.player.dna = 100; window.openEditor();')
        await page_mobile.wait_for_timeout(500)

        # Take Portrait Screenshot
        await page_mobile.screenshot(path='portrait_final.png')
        print("Saved portrait_final.png")

        # Check layout: Top/Bottom
        # Panels should be full width
        panels_m = await page_mobile.locator('.panel').all()
        box_m1 = await panels_m[0].bounding_box() # Should be Parts (Order 1 in CSS for second child?)
        # Wait, in CSS: .panel:first-child { order: 2 } (Bottom), .panel:last-child { order: 1 } (Top)
        # So DOM element 0 (Stats) should be at bottom (higher Y)
        # DOM element 1 (Parts) should be at top (lower Y)

        box_stats = await panels_m[0].bounding_box()
        box_parts = await panels_m[1].bounding_box()

        print(f"Portrait Stats Y: {box_stats['y']}")
        print(f"Portrait Parts Y: {box_parts['y']}")

        if box_parts['y'] < box_stats['y']:
             print("PASS: Parts panel is above Stats panel in Portrait.")
        else:
             print("FAIL: Layout order incorrect for Portrait.")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
