async function loadPageTutorials() {
    const pageType = document.getElementById('tutorial-list').dataset.type || 'All';
    const pageDevice = document.getElementById('tutorial-list').dataset.device || '';
    const tutorialList = document.getElementById('tutorial-list');
    let pageTutorials = [];

    try {
        const [databaseResponse, categoriesResponse, devicesResponse] = await Promise.all([
            fetch('/Other/TutorialDataBase.json', { cache: 'no-store' }),
            fetch('/Other/CategoriesList.json', { cache: 'no-store' }),
            fetch('/Other/DeviceList.json', { cache: 'no-store' })
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
    card.className = 'overflow-hidden border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg';

    const openButton = document.createElement('div');
    openButton.setAttribute('role', 'button');
    openButton.tabIndex = 0;
    openButton.className = 'group block w-full text-left focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-[-4px] focus-visible:outline-indigo-400';
    openButton.setAttribute('aria-label', `Open tutorial: ${tutorial.name || 'Untitled tutorial'}`);
    openButton.addEventListener('click', () => window.TutorialModal.open(tutorial));
    openButton.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            window.TutorialModal.open(tutorial);
        }
    });

    const preview = document.createElement('div');
    preview.className = 'relative flex aspect-video items-center justify-center overflow-hidden bg-slate-950';

    const youtubeId = getYoutubeVideoId(tutorial.videoUrl);
    if (youtubeId) {
        const thumbnail = document.createElement('img');
        thumbnail.className = 'h-full w-full object-cover transition duration-300 group-hover:scale-105';
        thumbnail.src = `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
        thumbnail.alt = '';
        thumbnail.loading = 'lazy';
        preview.appendChild(thumbnail);
    } else {
        const fallback = document.createElement('span');
        fallback.className = 'px-6 text-center text-lg font-semibold text-white';
        fallback.textContent = tutorial.name || 'Tutorial video';
        preview.appendChild(fallback);
    }

    const playIcon = document.createElement('span');
    playIcon.className = 'absolute flex h-14 w-14 items-center justify-center rounded-full border border-white/50 bg-slate-950/75 text-white shadow-lg transition group-hover:scale-110';
    playIcon.setAttribute('aria-hidden', 'true');
    playIcon.innerHTML = '<svg viewBox="0 0 24 24" class="ml-1 h-6 w-6 fill-current"><path d="M7 4.8v14.4L19 12 7 4.8Z"></path></svg>';
    preview.appendChild(playIcon);
    openButton.appendChild(preview);

    const content = document.createElement('div');
    content.className = 'space-y-3 p-5';

    const heading = document.createElement('h2');
    heading.className = 'text-xl font-semibold text-slate-900';
    heading.textContent = tutorial.name || 'Untitled tutorial';
    content.appendChild(heading);

    const description = document.createElement('p');
    description.className = 'text-sm leading-6 text-slate-600';
    description.textContent = tutorial.description || '';
    content.appendChild(description);

    const metadata = document.createElement('div');
    metadata.className = 'flex flex-wrap gap-2 pt-1';
    [tutorial.category || 'General', tutorial.type || 'Hardware', tutorial.type === 'Hardware' ? tutorial.device : '']
        .filter(Boolean)
        .forEach(value => {
            const badge = document.createElement('span');
            badge.className = 'rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-900';
            badge.textContent = value;
            metadata.appendChild(badge);
        });
    content.appendChild(metadata);

    const action = document.createElement('span');
    action.className = 'inline-flex items-center gap-2 pt-1 text-sm font-semibold text-indigo-700';
    action.textContent = 'View tutorial';
    const actionArrow = document.createElement('span');
    actionArrow.setAttribute('aria-hidden', 'true');
    actionArrow.textContent = '→';
    action.appendChild(actionArrow);
    content.appendChild(action);

    openButton.appendChild(content);
    card.appendChild(openButton);
    return card;
}

function getYoutubeVideoId(url) {
    const value = (url || '').trim();
    const youtubeMatch = value.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
    return youtubeMatch ? youtubeMatch[1] : '';
}

document.addEventListener('DOMContentLoaded', loadPageTutorials);
