(function () {
    let modal;
    let previousFocus;

    function createModal() {
        modal = document.createElement('div');
        modal.className = 'tutorial-modal-backdrop';
        modal.hidden = true;
        modal.innerHTML = `
            <section class="tutorial-modal" role="dialog" aria-modal="true" aria-labelledby="tutorial-modal-title" aria-describedby="tutorial-modal-description" tabindex="-1">
                <button class="tutorial-modal-close" type="button" aria-label="Затвори подробностите за урока">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"></path></svg>
                </button>
                <div class="tutorial-modal-media"></div>
                <div class="tutorial-modal-content">
                    <div class="tutorial-modal-metadata" aria-label="Подробности за урока"></div>
                    <h2 class="tutorial-modal-title" id="tutorial-modal-title"></h2>
                    <p class="tutorial-modal-description" id="tutorial-modal-description"></p>
                    <div class="tutorial-modal-steps"></div>
                    <p class="tutorial-modal-id"></p>
                </div>
            </section>`;

        modal.addEventListener('click', event => {
            if (event.target === modal || event.target.closest('.tutorial-modal-close')) close();
        });
        document.body.appendChild(modal);
    }

    function addMetadata(parent, label, value) {
        if (!value) return;
        const badge = document.createElement('span');
        badge.className = 'tutorial-modal-badge';
        badge.textContent = `${label}: ${value}`;
        parent.appendChild(badge);
    }

    function open(tutorial) {
        if (!modal) createModal();
        previousFocus = document.activeElement;

        const media = modal.querySelector('.tutorial-modal-media');
        const videoUrl = getEmbedUrl(tutorial.videoUrl);
        media.replaceChildren();
        if (videoUrl) {
            media.hidden = false;
            const video = document.createElement('iframe');
            video.src = videoUrl;
            video.title = `${tutorial.name || 'Урок'} — видео`;
            video.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
            video.allowFullscreen = true;
            video.referrerPolicy = 'strict-origin-when-cross-origin';
            media.appendChild(video);
        } else {
            media.hidden = true;
        }

        const metadata = modal.querySelector('.tutorial-modal-metadata');
        metadata.replaceChildren();
        addMetadata(metadata, 'Категория', translateCategory(tutorial.category || 'General'));
        addMetadata(metadata, 'Тип', translateType(tutorial.type || 'Hardware'));
        if ((tutorial.type || 'Hardware') === 'Hardware') addMetadata(metadata, 'Устройство', translateDevice(tutorial.device));

        modal.querySelector('.tutorial-modal-title').textContent = tutorial.name || 'Урок без заглавие';
        modal.querySelector('.tutorial-modal-description').textContent = tutorial.description || 'Няма предоставено описание.';

        const stepsContainer = modal.querySelector('.tutorial-modal-steps');
        stepsContainer.replaceChildren();
        if (Array.isArray(tutorial.stepsGuide) && tutorial.stepsGuide.length > 0) {
            const heading = document.createElement('h3');
            heading.className = 'tutorial-modal-steps-heading';
            heading.textContent = 'Стъпки';
            const steps = document.createElement('ol');
            steps.className = 'tutorial-modal-steps-list';
            tutorial.stepsGuide.forEach(step => {
                const item = document.createElement('li');
                item.textContent = step;
                steps.appendChild(item);
            });
            stepsContainer.append(heading, steps);
        }

        const id = modal.querySelector('.tutorial-modal-id');
        id.textContent = tutorial.tutorialId ? `Номер на урока: ${tutorial.tutorialId}` : '';
        modal.hidden = false;
        document.body.classList.add('tutorial-modal-open');
        modal.querySelector('.tutorial-modal-close').focus();
    }

    function close() {
        if (!modal || modal.hidden) return;
        modal.hidden = true;
        modal.querySelector('.tutorial-modal-media').replaceChildren();
        modal.querySelector('.tutorial-modal-media').hidden = false;
        document.body.classList.remove('tutorial-modal-open');
        if (previousFocus instanceof HTMLElement) previousFocus.focus();
    }

    function getEmbedUrl(url) {
        const value = (url || '').trim();
        const youtubeMatch = value.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
        if (youtubeMatch) return `https://www.youtube.com/embed/${youtubeMatch[1]}?autoplay=1&rel=0`;
        if (/(?:youtube\.com|youtu\.be)/i.test(value)) return '';
        return value;
    }

    function translateCategory(category) {
        return ({
            General: 'Общи',
            Repair: 'Ремонт',
            Upgrade: 'Надграждане',
            Clean: 'Почистване',
            Installation: 'Инсталация',
            Testing: 'Тестване',
            Update: 'Актуализация'
        })[category] || category;
    }

    function translateType(type) {
        return ({ Hardware: 'Хардуер', Software: 'Софтуер' })[type] || type;
    }

    function translateDevice(device) {
        return ({ Desktop: 'Настолен компютър', Laptop: 'Лаптоп', Phone: 'Телефон' })[device] || device || '';
    }

    document.addEventListener('keydown', event => {
        if (!modal || modal.hidden) return;
        if (event.key === 'Escape') {
            close();
            return;
        }
        if (event.key !== 'Tab') return;
        const focusable = Array.from(modal.querySelectorAll('button, iframe'))
            .filter(element => !element.hasAttribute('hidden'));
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    });

    window.TutorialModal = { open };
})();
