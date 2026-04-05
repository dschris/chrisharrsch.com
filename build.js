const fs = require('fs');
const path = require('path');
// Note: Native fetch is available in Node.js 18+. If on older version, might need node-fetch.
// Assuming Node 18+ for this environment.

// Paths
const TEMPLATE_PATH = path.join(__dirname, 'src', 'template.html');
const CONTENT_DIR = path.join(__dirname, 'content');
const OUTPUT_PATH = path.join(__dirname, 'index.html');

// Config
const GOODREADS_ID = '69847098'; // Updated with user's ID
const GOODREADS_RSS_URL = `https://www.goodreads.com/review/list_rss/${GOODREADS_ID}?shelf=read`;

// Helper to read JSON
const readJSON = (filename) => {
    const filePath = path.join(CONTENT_DIR, filename);
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
};

// Read all guides from content/guides/ directory
const readGuides = () => {
    const guidesDir = path.join(CONTENT_DIR, 'guides');
    if (!fs.existsSync(guidesDir)) return [];
    return fs.readdirSync(guidesDir)
        .filter(f => f.endsWith('.json'))
        .map(f => JSON.parse(fs.readFileSync(path.join(guidesDir, f), 'utf8')))
        .sort((a, b) => b.date.localeCompare(a.date));
};

// Simple XML Parser Helper (Regex based for simple RSS structure)
// Note: For production with complex XML, a library like xml2js is better, but this avoids dependencies.
const parseXML = (xml) => {
    const items = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;

    while ((match = itemRegex.exec(xml)) !== null) {
        const itemContent = match[1];

        const getTagValue = (tag) => {
            const regex = new RegExp(`<${tag}.*?>(.*?)<\/${tag}>`, 's');
            const result = regex.exec(itemContent);
            if (!result) return '';
            let content = result[1].trim();
            // Remove CDATA wrapper if present, handling multi-line
            content = content.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
            return content;
        };

        items.push({
            title: getTagValue('title'),
            link: getTagValue('link'),
            // Skip description, we only want clean data
            author: getTagValue('author_name'),
            rating: parseInt(getTagValue('user_rating') || '0', 10),
            pubDate: getTagValue('pubDate'),
            // Try to get higher res image, fallback to standard
            image_url: getTagValue('book_large_image_url') || getTagValue('book_medium_image_url') || getTagValue('book_image_url')
        });
    }
    return items;
};

// Fetch Goodreads Data
const fetchGoodreadsData = async (shelf = 'read') => {
    if (GOODREADS_ID === 'YOUR_GOODREADS_ID_HERE') {
        console.warn('Goodreads ID not set. Skipping fetch.');
        return [];
    }

    const url = `https://www.goodreads.com/review/list_rss/${GOODREADS_ID}?shelf=${shelf}`;

    try {
        console.log(`Fetching Goodreads data for ID: ${GOODREADS_ID}, Shelf: ${shelf}...`);
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch: ${response.statusText}`);
        }

        // Goodreads sometimes returns text containing CDATA that regex needs to handle carefully.
        const xml = await response.text();
        return parseXML(xml);
    } catch (error) {
        console.error(`Error fetching Goodreads data for shelf ${shelf}:`, error);
        return [];
    }
};

// Content Generators
const generateNowReadingHTML = (books) => {
    return books.map(book => {
        let imageHtml = '';
        if (book.image_url) {
            imageHtml = `<a href="${book.link}" target="_blank" rel="noopener noreferrer"><img src="${book.image_url}" alt="${book.title}" class="book-cover"></a>`;
        }

        return `
            <div class="book-item now-reading-item">
                ${imageHtml}
                <div class="book-info">
                    <h3><a href="${book.link}" target="_blank" rel="noopener noreferrer" class="book-title-link">${book.title}</a></h3>
                    <div class="book-author">by ${book.author}</div>
                </div>
            </div>`;
    }).join('');
};

const generateRecentlyReadHTML = (books) => {
    // Recent reads - Clean format: Cover, Title, Author
    return books.map(book => {
        let imageHtml = '';
        if (book.image_url) {
            imageHtml = `<a href="${book.link}" target="_blank" rel="noopener noreferrer"><img src="${book.image_url}" alt="${book.title}" class="book-cover"></a>`;
        }

        return `
            <div class="book-item">
                ${imageHtml}
                <div class="book-info">
                    <h3><a href="${book.link}" target="_blank" rel="noopener noreferrer" class="book-title-link">${book.title}</a></h3>
                    <div class="book-author">by ${book.author}</div>
                </div>
            </div>`;
    }).join('');
};

const generateReadGridHTML = (books) => {
    // Grid view of all read books
    return books.map(book => {
        let imageHtml = '';
        if (book.image_url) {
            imageHtml = `<a href="${book.link}" target="_blank" rel="noopener noreferrer"><img src="${book.image_url}" alt="${book.title}" class="recommendation-cover"></a>`;
        }
        return `
            <div class="recommendation-item">
                ${imageHtml}
                <h3><a href="${book.link}" target="_blank" rel="noopener noreferrer" class="book-title-link-small">${book.title}</a></h3>
                <div class="book-author-small">${book.author}</div>
                <div class="rating">
                    ${'★'.repeat(book.rating)}${'☆'.repeat(5 - book.rating)}
                </div>
            </div>`;
    }).join('');
};

const generateProjectsHTML = (projects) => {
    return projects.map(project => `
            <div class="project-item">
                <h3>
                    <a href="${project.link}" class="project-link" target="_blank" rel="noopener noreferrer">${project.title}</a>
                    ${project.github ? `<a href="${project.github}" class="github-link" target="_blank" rel="noopener noreferrer" title="view associated repo"><i class="fab fa-github"></i></a>` : ''}
                </h3>
                <p>${project.description}</p>
            </div>`).join('');
};

const generateHomelabHTML = (homelab, guides) => {
    // Generate rack units
    const rackUnitsHTML = homelab.rack.map(unit => {
        if (unit.size === 'shelf') {
            return `
                <div class="rack-unit size-shelf">
                    <span class="shelf-label">${unit.name}</span>
                </div>`;
        }

        const ledClass = unit.led === 'blue' ? 'led-blue' : 'led-green';
        const sizeClass = `size-${unit.size}`;

        // Port dots for the switch
        let portDotsHTML = '';
        if (unit.id === 'switch') {
            // Randomly illuminate ~8 ports
            const activePorts = new Set();
            while (activePorts.size < 8) {
                activePorts.add(Math.floor(Math.random() * 48));
            }
            const dots = Array.from({length: 48}, (_, i) => {
                const isActive = activePorts.has(i);
                return `<span class="port-dot${isActive ? ' active-port' : ''}"></span>`;
            }).join('');
            portDotsHTML = `<div class="port-dots">${dots}</div>`;
        }

        return `
                <div class="rack-unit ${sizeClass}" data-equipment-id="${unit.id}"
                     data-name="${unit.name}"
                     data-role="${unit.role}"
                     data-icon="${unit.icon}"
                     data-specs='${JSON.stringify(unit.specs)}'
                     data-services='${JSON.stringify(unit.services)}'>
                    <span class="unit-indicator">&gt;</span>
                    <span class="led-dot ${ledClass}"></span>
                    <div class="unit-content">
                        <span class="unit-name">${unit.name}</span>
                        ${unit.role ? `<span class="unit-role">${unit.role}</span>` : ''}
                        ${portDotsHTML}
                    </div>
                </div>`;
    }).join('');

    // Generate tower
    const tower = homelab.tower;
    const towerHTML = `
            <div class="tower-frame">
                <div class="tower-unit" data-equipment-id="${tower.id}"
                     data-name="${tower.name}"
                     data-role="${tower.role}"
                     data-icon="${tower.icon}"
                     data-specs='${JSON.stringify(tower.specs)}'
                     data-services='${JSON.stringify(tower.services)}'>
                    <span class="tower-name">${tower.name}</span>
                    <span class="tower-role">${tower.role.split(' — ')[0]}</span>
                    <div class="tower-gpu-glow"></div>
                </div>
            </div>
            <div class="tower-label">tower</div>`;

    // Generate guides
    const guidesHTML = guides.map(guide => {
        const tagsHTML = guide.tags.map(tag => `<span class="guide-tag">${tag}</span>`).join('');

        const sectionsHTML = guide.sections.map(section => {
            let bodyHTML = '';

            if (section.content) {
                bodyHTML += `<div class="guide-phase-content">${section.content.map(p => `<p>${p}</p>`).join('')}</div>`;
            }

            if (section.steps) {
                bodyHTML += `<ol class="guide-steps">${section.steps.map(step => `<li>${step}</li>`).join('')}</ol>`;
            }

            return `
                    <div class="guide-phase">
                        <h3 class="guide-phase-heading">${section.heading}</h3>
                        ${section.subtitle ? `<div class="guide-phase-subtitle">${section.subtitle}</div>` : ''}
                        ${bodyHTML}
                    </div>`;
        }).join('');

        return `
                <details class="guide-item">
                    <summary class="guide-summary">
                        <span class="guide-marker">▸</span>
                        <span class="guide-title">${guide.title}</span>
                        <span class="guide-date">${guide.date}</span>
                        <div class="guide-tags">${tagsHTML}</div>
                    </summary>
                    <div class="guide-body">
                        ${sectionsHTML}
                    </div>
                </details>`;
    }).join('');

    // Compose full homelab HTML
    return `
            <p class="homelab-intro">hover or click a unit to inspect // tap on mobile</p>
            <div class="homelab-diagram">
                <div>
                    ${towerHTML}
                </div>
                <div>
                    <div class="rack-frame">
                        <div class="rack-brand">&nbsp;</div>
                        ${rackUnitsHTML}
                    </div>
                    <div class="rack-label">rack</div>
                </div>
            </div>

            <div class="equipment-detail-panel" id="equipment-detail">
                <span class="detail-empty">← select equipment to inspect</span>
            </div>

            <div class="guides-section">
                <h2>Configuration Guides</h2>
                ${guidesHTML}
            </div>`;
};

const generateResumeHTML = (resume) => {
    const experienceHTML = resume.experience.map(exp => `
                <div class="resume-item">
                    <div class="resume-title">${exp.title}</div>
                    <div class="resume-date">${exp.date}</div>
                    ${exp.description.map(desc => `<p>${desc}</p>`).join('')}
                </div>`).join('');

    const educationHTML = resume.education.map(edu => `
                <div class="resume-item">
                    <div class="resume-title">${edu.title}</div>
                    <div class="resume-date">${edu.date}</div>
                    ${edu.details ? `<p>${edu.details}</p>` : ''}
                </div>`).join('');

    const skillsHTML = resume.skills.map(skill => `<span class="skill-tag">${skill}</span>`).join('');

    return { experienceHTML, educationHTML, skillsHTML };
};

const generateBlogHTML = (posts) => {
    return posts.map(post => `
            <article class="blog-post">
                <h3>${post.title}</h3>
                <div class="blog-date">${post.date}</div>
                <p>${post.excerpt}</p>
            </article>`).join('');
};

const generateContactHTML = (contact) => {
    const linksHTML = contact.links.map(link => `
                <a target="_blank" rel="noopener noreferrer" class="social-icon" href="${link.href}"><i class="${link.icon}"></i></a>`).join('');
    return { intro: contact.intro, linksHTML };
};

// Main Build Function
const build = async () => {
    console.log('Building site...');

    // Read Template
    let template = fs.readFileSync(TEMPLATE_PATH, 'utf8');

    // Read Content
    const home = readJSON('home.json');
    // const booksLocal = readJSON('books.json'); // Legacy local books
    const projects = readJSON('projects.json');
    const homelab = readJSON('homelab.json');
    const guides = readGuides();
    const resume = readJSON('resume.json');
    const contact = readJSON('contact.json');

    // Fetch External Data
    const currentlyReadingBooks = await fetchGoodreadsData('currently-reading');
    const readBooks = await fetchGoodreadsData('read');

    // Logic:
    // 1. Now Reading: All from 'currently-reading'
    // 2. Recently Read: Top 5 from 'read'
    // 3. Read (Grid): All from 'read'

    const recentlyRead = readBooks.slice(0, 5);

    // Generate HTML parts
    const nowReadingHTML = generateNowReadingHTML(currentlyReadingBooks);
    const recentlyReadHTML = generateRecentlyReadHTML(recentlyRead);
    const readGridHTML = generateReadGridHTML(readBooks);

    const projectsHTML = generateProjectsHTML(projects);
    const homelabHTML = generateHomelabHTML(homelab, guides);
    const { experienceHTML, educationHTML, skillsHTML } = generateResumeHTML(resume);
    const { intro: contactIntro, linksHTML: contactLinksHTML } = generateContactHTML(contact);

    // Replace Placeholders
    let output = template
        .replace('{{HOME_TITLE}}', home.title)
        .replace('{{HOME_INTRO}}', Array.isArray(home.intro) ?
            home.intro.map(p => `<p>${p}</p>`).join('') :
            `<p>${home.intro}</p>`)
        .replace('{{NOW_READING_CONTENT}}', nowReadingHTML ?
            `<div class="now-reading-section"><h3>Now Reading</h3>${nowReadingHTML}</div>` : '')
        .replace('{{RECENTLY_READ_CONTENT}}', recentlyReadHTML)
        .replace('{{READ_GRID_CONTENT}}', readGridHTML ?
            `<section id="recommendations"><h2>Read</h2><div class="recommendations-grid">${readGridHTML}</div></section>` : '')
        .replace('{{PROJECTS_CONTENT}}', projectsHTML)
        .replace('{{HOMELAB_CONTENT}}', homelabHTML)
        .replace('{{RESUME_EXPERIENCE}}', experienceHTML)
        .replace('{{RESUME_EDUCATION}}', educationHTML)
        .replace('{{RESUME_SKILLS}}', skillsHTML)
        .replace('{{CONTACT_INTRO}}', contactIntro)
        .replace('{{CONTACT_LINKS}}', contactLinksHTML);

    // Write Output
    fs.writeFileSync(OUTPUT_PATH, output);
    console.log(`Site built successfully at ${OUTPUT_PATH}`);
};

build();
