const fs = require('fs');
const path = require('path');

// Paths
const TEMPLATE_PATH = path.join(__dirname, 'src', 'template.html');
const CONTENT_DIR = path.join(__dirname, 'content');
const OUTPUT_PATH = path.join(__dirname, 'index.html');

// Helper to read JSON
const readJSON = (filename) => {
    const filePath = path.join(CONTENT_DIR, filename);
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
};

// Content Generators
const generateBooksHTML = (books) => {
    return books.map(book => `
            <div class="book-item">
                <h3>${book.title}</h3>
                <p>${book.description}</p>
            </div>`).join('');
};

const generateProjectsHTML = (projects) => {
    return projects.map(project => `
            <div class="project-item">
                <h3><a href="${project.link}" class="project-link" target="_blank" rel="noopener noreferrer">${project.title}</a></h3>
                <p>${project.description}</p>
            </div>`).join('');
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
const build = () => {
    console.log('Building site...');

    // Read Template
    let template = fs.readFileSync(TEMPLATE_PATH, 'utf8');

    // Read Content
    const home = readJSON('home.json');
    const books = readJSON('books.json');
    const projects = readJSON('projects.json');
    const resume = readJSON('resume.json');
    const blog = readJSON('blog.json');
    const contact = readJSON('contact.json');

    // Generate HTML parts
    const booksHTML = generateBooksHTML(books);
    const projectsHTML = generateProjectsHTML(projects);
    const { experienceHTML, educationHTML, skillsHTML } = generateResumeHTML(resume);
    const blogHTML = generateBlogHTML(blog);
    const { intro: contactIntro, linksHTML: contactLinksHTML } = generateContactHTML(contact);

    // Replace Placeholders
    let output = template
        .replace('{{HOME_TITLE}}', home.title)
        .replace('{{HOME_INTRO}}', home.intro)
        .replace('{{BOOKS_CONTENT}}', booksHTML)
        .replace('{{PROJECTS_CONTENT}}', projectsHTML)
        .replace('{{RESUME_EXPERIENCE}}', experienceHTML)
        .replace('{{RESUME_EDUCATION}}', educationHTML)
        .replace('{{RESUME_SKILLS}}', skillsHTML)
        .replace('{{BLOG_CONTENT}}', blogHTML)
        .replace('{{CONTACT_INTRO}}', contactIntro)
        .replace('{{CONTACT_LINKS}}', contactLinksHTML);

    // Write Output
    fs.writeFileSync(OUTPUT_PATH, output);
    console.log(`Site built successfully at ${OUTPUT_PATH}`);
};

build();
