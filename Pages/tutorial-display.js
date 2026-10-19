async function loadPageTutorials() {
    const pageType = document.getElementById('tutorial-list').dataset.type || 'All';
    const pageDevice = document.getElementById('tutorial-list').dataset.device || '';
    const tutorialList = document.getElementById('tutorial-list');
    let pageTutorials = [];

    try {
        const [databaseResponse, categoriesResponse, devicesResponse] = await Promise.all([
            fetch('../Other/TutorialDataBase.json', { cache: 'no-store' }),
            fetch('../Other/CategoriesList.json', { cache: 'no-store' }),
            fetch('../Other/DeviceList.json', { cache: 'no-store' })
        ]);
        if (!databaseResponse.ok || !categoriesResponse.ok || !devicesResponse.ok) {
            throw new Error('Could not load the tutorial JSON files.');
        }

        const [database, categoriesByType, devices] = await Promise.all([
            databaseResponse.json(),
            categoriesResponse.json(),
            devicesResponse.json()
        ]);
        if (!Array.isArray(database.tutorials)) {
            throw new Error('TutorialDataBase.json must contain a tutorials array.');
        }

        const filteredTutorials = database.tutorials.filter(tutorial => {
            const tutorialType = tutorial.type || 'Hardware';
            const tutorialDevice = tutorial.device || devices[0];
            return (pageType === 'All' || tutorialType === pageType)
                && (!pageDevice || tutorialType !== 'Hardware' || tutorialDevice === pageDevice);
        });
        pageTutorials = filteredTutorials;

        const categoryFilter = document.getElementById('tutorial-category-filter');
        if (categoryFilter) {
            const categories = categoriesByType[pageType] || [];
            categories.forEach(category => categoryFilter.add(new Option(category, category)));
            const requestedCategory = new URLSearchParams(location.search).get('category');
            if (categories.includes(requestedCategory)) categoryFilter.value = requestedCategory;
            categoryFilter.addEventListener('change', () => renderPageTutorials(pageTutorials));
        }

        renderPageTutorials(pageTutorials);
    } catch (error) {
        console.error('Could not display tutorials:', error);
        tutorialList.innerHTML = '<p class="col-span-full py-12 text-center text-red-700">Tutorials could not be loaded. Open the site through a local web server and check the JSON files.</p>';
    }
}

function renderPageTutorials(tutorials) {
    const tutorialList = document.getElementById('tutorial-list');
    const categoryFilter = document.getElementById('tutorial-category-filter');
    const selectedCategory = categoryFilter?.value || 'All';
    const visibleTutorials = selectedCategory === 'All'
        ? tutorials
        : tutorials.filter(tutorial => (tutorial.category || 'General') === selectedCategory);

    if (visibleTutorials.length === 0) {
        tutorialList.innerHTML = '<p class="col-span-full py-12 text-center text-slate-500">No tutorials in this category yet.</p>';
        return;
    }
    tutorialList.replaceChildren(...visibleTutorials.map(createTutorialCard));
}

function createTutorialCard(tutorial) {
    const card = document.createElement('article');
    card.className = 'overflow-hidden border border-slate-200 bg-white shadow-sm';

    const videoFrame = document.createElement('iframe');
    videoFrame.className = 'aspect-video w-full bg-slate-950';
    videoFrame.src = getTutorialEmbedUrl(tutorial.videoUrl);
    videoFrame.title = tutorial.name || 'Tutorial video';
    videoFrame.loading = 'lazy';
    videoFrame.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    videoFrame.allowFullscreen = true;
    card.appendChild(videoFrame);

    const content = document.createElement('div');
    content.className = 'space-y-4 p-5';

    const heading = document.createElement('h2');
    heading.className = 'text-xl font-semibold text-slate-900';
    heading.textContent = tutorial.name || 'Untitled tutorial';
    content.appendChild(heading);

    const description = document.createElement('p');
    description.className = 'text-sm leading-6 text-slate-600';
    description.textContent = tutorial.description || '';
    content.appendChild(description);

    if (Array.isArray(tutorial.stepsGuide) && tutorial.stepsGuide.length > 0) {
        const steps = document.createElement('ol');
        steps.className = 'list-decimal space-y-2 border-t border-slate-100 pt-4 pl-5 text-sm leading-6 text-slate-700';
        tutorial.stepsGuide.forEach(step => {
            const item = document.createElement('li');
            item.textContent = step;
            steps.appendChild(item);
        });
        content.appendChild(steps);
    }

    const id = document.createElement('p');
    id.className = 'border-t border-slate-100 pt-3 font-mono text-xs text-slate-400';
    id.textContent = `Tutorial ID: ${tutorial.tutorialId}`;
    content.appendChild(id);

    card.appendChild(content);
    return card;
}

function getTutorialEmbedUrl(url) {
    const value = (url || '').trim();
    const youtubeMatch = value.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
    return youtubeMatch ? `https://www.youtube.com/embed/${youtubeMatch[1]}?rel=0` : value;
}

document.addEventListener('DOMContentLoaded', loadPageTutorials);
