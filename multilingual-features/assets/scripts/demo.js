// Multilingual Features Demo

let data = null;

function highlightActivations(text, highlights) {
    // Sort highlights by length descending (to match longer strings first)
    const sortedHighlights = [...highlights].sort((a, b) => b.text.length - a.text.length);

    let result = text;
    sortedHighlights.forEach(h => {
        const className = h.activation >= 0.7 ? 'highlighted' : 'highlighted-light';
        // Use global replace to highlight all occurrences
        const escaped = h.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escaped, 'g');
        result = result.replace(regex, `<span class="token ${className}">${h.text}</span>`);
    });

    return result;
}

function renderLanguageExample(example) {
    // Create a grid cell for Clarity columns layout
    const div = document.createElement('div');
    div.className = 'demo-cell';

    const textContainer = document.createElement('div');
    textContainer.className = 'tokens-container';
    textContainer.innerHTML = highlightActivations(example.text, example.highlights || []);

    div.appendChild(textContainer);

    // Add caption with language name
    const caption = document.createElement('p');
    caption.className = 'caption';
    caption.innerHTML = `<b>${example.language}</b>`;
    div.appendChild(caption);

    return div;
}

function renderFeatureSection(feature) {
    const section = document.createElement('div');
    section.className = 'feature-section';

    // Add feature title
    const title = document.createElement('p');
    title.className = 'feature-title';
    title.innerHTML = `<b>${feature.name}</b>`;
    section.appendChild(title);

    // Add examples in a grid
    const grid = document.createElement('div');
    grid.className = 'columns-4';
    feature.examples.forEach(example => {
        grid.appendChild(renderLanguageExample(example));
    });
    section.appendChild(grid);

    return section;
}

function renderAllFeatures() {
    const container = document.getElementById('activation-demo');
    if (!container) return;
    container.innerHTML = '';

    if (!data?.features?.length) {
        container.innerHTML = '<p>No features available.</p>';
        return;
    }

    data.features.forEach(feature => {
        container.appendChild(renderFeatureSection(feature));
    });
}

function renderAblationDemo() {
    const container = document.getElementById('ablation-demo');
    if (!container) return; // Container was removed from HTML
    if (!data?.ablation?.examples?.length) {
        container.innerHTML = '<p>No ablation examples available.</p>';
        return;
    }

    container.innerHTML = '';
    const example = data.ablation.examples[0];

    // Source cell
    const sourceCell = document.createElement('div');
    sourceCell.className = 'demo-cell';
    sourceCell.innerHTML = `
        <div class="ablation-box">
            ${example.source.text}
        </div>
        <p class="caption"><b>Source</b><br>${example.source.language}</p>
    `;
    container.appendChild(sourceCell);

    // Baseline translation cell
    const baselineCell = document.createElement('div');
    baselineCell.className = 'demo-cell';
    baselineCell.innerHTML = `
        <div class="ablation-box baseline">
            ${example.baseline.text}
        </div>
        <p class="caption"><b>Baseline</b><br>${example.baseline.language}</p>
    `;
    container.appendChild(baselineCell);

    // Ablated translation cell
    const ablatedCell = document.createElement('div');
    ablatedCell.className = 'demo-cell';
    ablatedCell.innerHTML = `
        <div class="ablation-box ablated">
            ${example.ablated.text}
        </div>
        <p class="caption"><b>After Ablation</b><br>${example.ablated.language}</p>
    `;
    container.appendChild(ablatedCell);
}

function initActivationDemo() {
    renderAllFeatures();
}

function setupCopyButton() {
    const button = document.getElementById('copy-citation');
    const citation = document.getElementById('citation-text');
    const originalHTML = button.innerHTML;

    button.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(citation.textContent);
            button.innerHTML = '<i class="fa-solid fa-check"></i>';
            button.classList.add('copied');
            setTimeout(() => {
                button.innerHTML = originalHTML;
                button.classList.remove('copied');
            }, 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    });
}

// ==================== Steering Demo ====================

let steeringData = null;
let currentSteeringExample = null;

function highlightText(text, highlights, className) {
    // Highlight specified words in the text
    // Sort by length descending to match longer phrases first
    const sortedHighlights = [...highlights].sort((a, b) => b.length - a.length);
    let result = text;
    sortedHighlights.forEach(word => {
        // Escape special regex characters
        const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(${escaped})`, 'gi');
        result = result.replace(regex, `<span class="${className}">$1</span>`);
    });
    return result;
}

function renderSteeringOutputs() {
    if (!currentSteeringExample) return;

    const baselineEl = document.getElementById('steering-baseline');
    const steeredEl = document.getElementById('steering-steered');
    const steeredLabelEl = document.getElementById('steering-steered-label');

    // Render baseline
    baselineEl.innerHTML = highlightText(
        currentSteeringExample.baseline.text,
        currentSteeringExample.baseline.highlights,
        'highlight-baseline'
    );

    // Render steered
    steeredEl.innerHTML = highlightText(
        currentSteeringExample.steered.text,
        currentSteeringExample.steered.highlights,
        'highlight-steered'
    );

    // Update steered label with feature
    steeredLabelEl.textContent = `Steered Translation (${currentSteeringExample.direction} ${currentSteeringExample.feature})`;
}

function selectSteeringExample(example) {
    currentSteeringExample = example;

    // Update source
    const sourceEl = document.getElementById('steering-source');
    const sourceLabelEl = document.getElementById('steering-source-label');
    sourceLabelEl.textContent = `Input (${example.source.language})`;
    sourceEl.textContent = example.source.text;

    // Update navigation buttons
    document.querySelectorAll('.steering-nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.id === example.id);
    });

    // Render both outputs
    renderSteeringOutputs();
}

function setupSteeringDemo(examples) {
    if (!examples?.length) return;

    const navEl = document.getElementById('steering-nav');

    if (!navEl) return;

    // Create navigation buttons
    navEl.innerHTML = '';
    examples.forEach((example, i) => {
        const btn = document.createElement('button');
        btn.className = 'steering-nav-btn' + (i === 0 ? ' active' : '');
        btn.dataset.id = example.id;
        btn.innerHTML = `
            <span class="nav-feature">${example.concept}</span>
            <span class="nav-languages">${example.name}</span>
        `;
        btn.addEventListener('click', () => selectSteeringExample(example));
        navEl.appendChild(btn);
    });

    // Select first example
    selectSteeringExample(examples[0]);
}

async function initSteeringDemo() {
    try {
        const response = await fetch('data/steering.json');
        steeringData = await response.json();
        setupSteeringDemo(steeringData.examples);
    } catch (err) {
        console.error('Failed to load steering data:', err);
    }
}

async function init() {
    try {
        const response = await fetch('data/activations.json');
        data = await response.json();

        initActivationDemo();
        setupCopyButton();
    } catch (err) {
        console.error('Failed to load data:', err);
        document.getElementById('activation-demo').innerHTML =
            '<p>Error loading activation data.</p>';
    }

    // Initialize steering demo (separate data file)
    initSteeringDemo();
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);
