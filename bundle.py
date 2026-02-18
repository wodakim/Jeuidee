import os
import re

def bundle():
    # Order matters for dependency
    js_files = [
        'js/audio.js',
        'js/physics.js',
        'js/stats.js',
        'js/camera.js',
        'js/settings.js',
        'js/assets.js',
        'js/renderer.js',
        'js/save_manager.js',
        'js/progression.js',
        'js/input.js',
        'js/enemy.js',
        'js/boids.js',
        'js/debris.js',
        'js/ik.js',
        'js/lighting.js',
        'js/biomes.js',
        'js/legacy.js',
        'js/social.js',
        'js/editor.js',
        'js/skills.js',
        'js/distortion.js',
        'js/boss.js',
        'js/sonar.js',
        'js/ally.js',
        'js/state_machine.js',
        'js/states/menu_state.js',
        'js/states/play_state.js',
        'js/states/gameover_state.js',
        'js/states/intro.js',
        'js/states/genesis_state.js',
        'js/gameloop.js'
    ]

    css_file = 'style.css'
    html_file = 'index.html'
    output_file = 'dist/index.html'

    # Create dist folder if not exists
    if not os.path.exists('dist'):
        os.makedirs('dist')

    # Read CSS
    try:
        with open(css_file, 'r') as f:
            css_content = f.read()
    except FileNotFoundError:
        css_content = "" # Fallback if missing

    # Read JS and process
    js_content = ""
    for js in js_files:
        if not os.path.exists(js):
            print(f"Warning: File {js} not found, skipping.")
            continue

        with open(js, 'r') as f:
            content = f.read()
            # Remove imports
            content = re.sub(r'import .* from .*;', '', content)
            # Remove exports (export default class -> class)
            content = re.sub(r'export default class', 'class', content)
            # Remove regular exports (export class -> class)
            content = re.sub(r'export class', 'class', content)
            # Remove export { } at end
            content = re.sub(r'export \{.*\};', '', content)

            js_content += f"\n// --- {js} ---\n{content}\n"

    # Read HTML
    with open(html_file, 'r') as f:
        html_content = f.read()

    # Replace CSS Link
    if '<link rel="stylesheet" href="style.css">' in html_content:
        html_content = html_content.replace(
            '<link rel="stylesheet" href="style.css">',
            f'<style>\n{css_content}\n</style>'
        )
    else:
        # Just insert style in head
        html_content = html_content.replace('</head>', f'<style>\n{css_content}\n</style>\n</head>')

    # Replace JS Script (Change type="module" to standard script)
    # The original line is <script type="module" src="js/gameloop.js"></script>
    if '<script type="module" src="js/gameloop.js"></script>' in html_content:
        html_content = re.sub(
            r'<script type="module" src="js/gameloop.js"></script>',
            f'<script>\n{js_content}\n</script>',
            html_content
        )
    else:
        # Just append script at end of body
        html_content = html_content.replace('</body>', f'<script>\n{js_content}\n</script>\n</body>')

    # Write Output
    with open(output_file, 'w') as f:
        f.write(html_content)

    print(f"Bundled successfully to {output_file}")

if __name__ == "__main__":
    bundle()
