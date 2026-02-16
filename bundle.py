import os
import re

def bundle():
    # Order matters for dependency
    js_files = [
        'js/audio.js',
        'js/physics.js',
        'js/stats.js',
        'js/camera.js',
        'js/renderer.js',
        'js/input.js',
        'js/enemy.js',
        'js/editor.js',
        'js/gameloop.js'
    ]

    css_file = 'style.css'
    html_file = 'index.html'
    output_file = 'dist/index.html'

    # Create dist folder if not exists
    if not os.path.exists('dist'):
        os.makedirs('dist')

    # Read CSS
    with open(css_file, 'r') as f:
        css_content = f.read()

    # Read JS and process
    js_content = ""
    for js in js_files:
        with open(js, 'r') as f:
            content = f.read()
            # Remove imports
            content = re.sub(r'import .* from .*;', '', content)
            # Remove exports (export default class -> class)
            content = re.sub(r'export default class', 'class', content)
            # Remove regular exports (export class -> class)
            content = re.sub(r'export class', 'class', content)

            js_content += f"\n// --- {js} ---\n{content}\n"

    # Read HTML
    with open(html_file, 'r') as f:
        html_content = f.read()

    # Replace CSS Link
    html_content = html_content.replace(
        '<link rel="stylesheet" href="style.css">',
        f'<style>\n{css_content}\n</style>'
    )

    # Replace JS Script (Change type="module" to standard script)
    # The original line is <script type="module" src="js/gameloop.js"></script>
    html_content = re.sub(
        r'<script type="module" src="js/gameloop.js"></script>',
        f'<script>\n{js_content}\n</script>',
        html_content
    )

    # Write Output
    with open(output_file, 'w') as f:
        f.write(html_content)

    print(f"Bundled successfully to {output_file}")

if __name__ == "__main__":
    bundle()
