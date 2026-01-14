# Chris's Personal Site

A minimalist, terminal-themed personal website designed for efficiency and keyboard-centric navigation.

## Features

- **Terminal Aesthetic**: Clean, monospaced design with a prompt-based interface.
- **Vim-Style Navigation**: Navigate sections using `h`, `j`, `k`, `l` keys.
- **Keyboard Shortcuts**: Jump to specific sections using number keys `1-5`.
- **Theme Support**: Toggle between Dark and Light modes (press `t` or click the sun/moon icon).
- **Responsive Design**: Works seamlessly on desktop and mobile devices.

## Sections

1. **Home**: Introduction and background.
2. **Books**: Curated list of book recommendations.
3. **Resume**: Professional experience, education, and technical skills.
4. **Projects**: Showcase of prototype webapps.
5. **Blog**: Thoughts on technology and web development.
6. **Contact**: Social links and email information.

## Tech Stack

- **HTML5**: Semantic structure.
- **CSS3**: Custom styling with CSS variables for theming.
- **JavaScript**: Handling navigation and state management.
- **Font Awesome**: Icons for social links and UI elements.

## Local Development

To run this project locally:

1. Clone the repository.
2. Edit content in the `content/` directory (JSON files).
3. Run `node build.js` to generate `index.html`.
4. Open `index.html` in your preferred web browser.

**Note**: Do not edit `index.html` directly as it is generated from `src/template.html` and the content files.

## License

[MIT](LICENSE)
