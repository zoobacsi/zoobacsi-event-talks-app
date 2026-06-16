document.addEventListener('DOMContentLoaded', () => {
    // --- State ---
    let rawEntries = [];
    let parsedItems = [];
    let currentlyFilteredItems = [];
    let currentFilter = 'all';
    let searchQuery = '';
    let selectedItemForTweet = null;

    // --- DOM Elements ---
    const btnRefresh = document.getElementById('btn-refresh');
    const btnExportCsv = document.getElementById('btn-export-csv');
    const spinner = document.getElementById('spinner');
    const searchInput = document.getElementById('search-input');
    const btnClearSearch = document.getElementById('btn-clear-search');
    const filterChips = document.querySelectorAll('.filter-chip');
    const timelineFeed = document.getElementById('timeline-feed');
    const skeletonLoader = document.getElementById('skeleton-loader');
    const errorState = document.getElementById('error-state');
    const errorMessage = document.getElementById('error-message');
    const btnRetry = document.getElementById('btn-retry');
    const emptyState = document.getElementById('empty-state');
    const btnResetFilters = document.getElementById('btn-reset-filters');

    // Tweet Modal Elements
    const tweetModal = document.getElementById('tweet-modal');
    const btnCloseModal = document.getElementById('btn-close-modal');
    const btnCancelTweet = document.getElementById('btn-cancel-tweet');
    const btnSendTweet = document.getElementById('btn-send-tweet');
    const tweetTextarea = document.getElementById('tweet-textarea');
    const charCurrent = document.getElementById('char-current');
    const tweetModalBadge = document.getElementById('tweet-modal-badge');
    const tweetModalDate = document.getElementById('tweet-modal-date');
    const tweetModalPreviewText = document.getElementById('tweet-modal-preview-text');
    const tweetWarningMsg = document.getElementById('tweet-warning-msg');

    // --- Feed Fetching and Parsing ---
    
    async function loadFeed() {
        showLoadingState();
        try {
            const response = await fetch('/api/releases');
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Failed to fetch release notes feed.');
            }

            rawEntries = data.entries;
            parsedItems = parseEntries(rawEntries);
            
            hideLoadingState();
            applyFiltersAndRender();
        } catch (error) {
            console.error('Error loading release notes:', error);
            showErrorState(error.message);
        }
    }

    /**
     * Splits multi-part entry HTML into individual release note items
     */
    function parseEntries(entries) {
        const items = [];
        const parser = new DOMParser();

        entries.forEach(entry => {
            if (!entry.content) return;

            // Parse HTML content
            const doc = parser.parseFromString(entry.content, 'text/html');
            const children = Array.from(doc.body.children);
            
            let currentItem = null;

            children.forEach(child => {
                if (child.tagName === 'H3') {
                    // Save the previous item before starting a new one
                    if (currentItem) {
                        items.push(currentItem);
                    }
                    
                    const category = child.textContent.trim();
                    currentItem = {
                        id: `${entry.id}_${items.length}`, // Unique sub-item ID
                        date: entry.title, // e.g. "June 15, 2026"
                        category: category,
                        categoryClass: getCategoryClass(category),
                        contentHtml: '',
                        contentText: '',
                        link: entry.link
                    };
                } else {
                    if (!currentItem) {
                        // Edge case: content exists before any h3 header
                        currentItem = {
                            id: `${entry.id}_${items.length}`,
                            date: entry.title,
                            category: 'Update',
                            categoryClass: 'category-other',
                            contentHtml: '',
                            contentText: '',
                            link: entry.link
                        };
                    }
                    currentItem.contentHtml += child.outerHTML;
                    currentItem.contentText += child.textContent + ' ';
                }
            });

            // Push the final item for this entry
            if (currentItem) {
                items.push(currentItem);
            }
        });

        // Clean up texts and trim whitespaces
        items.forEach(item => {
            item.contentText = item.contentText.replace(/\s+/g, ' ').trim();
        });

        return items;
    }

    function getCategoryClass(category) {
        const cat = category.toLowerCase();
        if (cat.includes('feature')) return 'category-feature';
        if (cat.includes('issue') || cat.includes('fix') || cat.includes('defect')) return 'category-issue';
        if (cat.includes('change') || cat.includes('update') || cat.includes('modified')) return 'category-changed';
        if (cat.includes('deprecat')) return 'category-deprecated';
        return 'category-other';
    }

    // --- State Handlers ---

    function showLoadingState() {
        spinner.classList.add('spinning');
        btnRefresh.disabled = true;
        skeletonLoader.style.display = 'block';
        timelineFeed.style.display = 'none';
        errorState.style.display = 'none';
        emptyState.style.display = 'none';
    }

    function hideLoadingState() {
        spinner.classList.remove('spinning');
        btnRefresh.disabled = false;
        skeletonLoader.style.display = 'none';
        timelineFeed.style.display = 'block';
    }

    function showErrorState(message) {
        spinner.classList.remove('spinning');
        btnRefresh.disabled = false;
        skeletonLoader.style.display = 'none';
        timelineFeed.style.display = 'none';
        emptyState.style.display = 'none';
        
        errorState.style.display = 'flex';
        errorMessage.textContent = message || 'Could not connect to the server or parse the feed. Please try again.';
    }

    // --- Filter and Render Logic ---

    function applyFiltersAndRender() {
        // 1. Filter items
        let filtered = parsedItems.filter(item => {
            // Category Filter
            if (currentFilter !== 'all') {
                const itemClass = item.categoryClass;
                if (currentFilter === 'feature' && itemClass !== 'category-feature') return false;
                if (currentFilter === 'issue' && itemClass !== 'category-issue') return false;
                if (currentFilter === 'changed' && itemClass !== 'category-changed') return false;
                if (currentFilter === 'deprecated' && itemClass !== 'category-deprecated') return false;
            }

            // Search Query Filter
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                const matchesText = item.contentText.toLowerCase().includes(query);
                const matchesCategory = item.category.toLowerCase().includes(query);
                const matchesDate = item.date.toLowerCase().includes(query);
                return matchesText || matchesCategory || matchesDate;
            }

            return true;
        });

        // 2. Render feed or show empty state
        currentlyFilteredItems = filtered;
        if (filtered.length === 0) {
            timelineFeed.style.display = 'none';
            emptyState.style.display = 'flex';
        } else {
            emptyState.style.display = 'none';
            timelineFeed.style.display = 'block';
            renderTimeline(filtered);
        }
    }

    function renderTimeline(items) {
        // Group items by date to show date headers
        const grouped = {};
        items.forEach(item => {
            if (!grouped[item.date]) {
                grouped[item.date] = [];
            }
            grouped[item.date].push(item);
        });

        timelineFeed.innerHTML = '';

        Object.keys(grouped).forEach(date => {
            const dateGroup = document.createElement('div');
            dateGroup.className = 'timeline-group';

            // Create marker dot
            const marker = document.createElement('div');
            marker.className = 'timeline-date-marker';
            dateGroup.appendChild(marker);

            // Create date header
            const header = document.createElement('h3');
            header.className = 'timeline-date-header';
            header.textContent = date;
            dateGroup.appendChild(header);

            // Create cards container
            const cardsContainer = document.createElement('div');
            cardsContainer.className = 'timeline-items';

            // Append cards for this date
            grouped[date].forEach(item => {
                const card = createReleaseCard(item);
                cardsContainer.appendChild(card);
            });

            dateGroup.appendChild(cardsContainer);
            timelineFeed.appendChild(dateGroup);
        });
    }

    function createReleaseCard(item) {
        const card = document.createElement('article');
        card.className = `release-card ${item.categoryClass}`;
        
        // Header
        const header = document.createElement('div');
        header.className = 'card-header';

        const meta = document.createElement('div');
        meta.className = 'card-meta';

        const badge = document.createElement('span');
        badge.className = 'badge';
        badge.textContent = item.category;
        meta.appendChild(badge);

        const dateTag = document.createElement('span');
        dateTag.className = 'card-date';
        dateTag.textContent = item.date;
        meta.appendChild(dateTag);

        header.appendChild(meta);

        // Actions
        const actions = document.createElement('div');
        actions.className = 'card-actions';

        // Tweet Button
        const btnTweet = document.createElement('button');
        btnTweet.className = 'btn-icon-tweet';
        btnTweet.title = 'Share this update on X / Twitter';
        btnTweet.innerHTML = `
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path>
            </svg>
        `;
        btnTweet.addEventListener('click', (e) => {
            e.stopPropagation();
            openTweetModal(item);
        });
        actions.appendChild(btnTweet);

        // Link Button
        if (item.link) {
            const btnLink = document.createElement('a');
            btnLink.className = 'btn-icon-link';
            btnLink.href = item.link;
            btnLink.target = '_blank';
            btnLink.rel = 'noopener noreferrer';
            btnLink.title = 'Open official release notes page';
            btnLink.innerHTML = `
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                    <polyline points="15 3 21 3 21 9"></polyline>
                    <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
            `;
            actions.appendChild(btnLink);
        }

        // Copy to Clipboard Button
        const btnCopy = document.createElement('button');
        btnCopy.className = 'btn-icon-copy';
        btnCopy.title = 'Copy details to clipboard';
        
        const copySvg = `
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
        `;
        const successSvg = `
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
        `;
        btnCopy.innerHTML = copySvg;

        btnCopy.addEventListener('click', async (e) => {
            e.stopPropagation();
            const textToCopy = `BigQuery Update (${item.date}) - ${item.category}:\n${item.contentText}\n\nLink: ${item.link || 'N/A'}`;
            try {
                await navigator.clipboard.writeText(textToCopy);
                btnCopy.classList.add('success');
                btnCopy.innerHTML = successSvg;
                btnCopy.title = 'Copied!';
                setTimeout(() => {
                    btnCopy.classList.remove('success');
                    btnCopy.innerHTML = copySvg;
                    btnCopy.title = 'Copy details to clipboard';
                }, 2000);
            } catch (err) {
                console.error('Failed to copy text: ', err);
            }
        });
        actions.appendChild(btnCopy);

        header.appendChild(actions);
        card.appendChild(header);

        // Body Content
        const body = document.createElement('div');
        body.className = 'card-body';
        body.innerHTML = item.contentHtml;
        card.appendChild(body);

        return card;
    }

    // --- Tweet Compose Modal Logic ---

    function openTweetModal(item) {
        selectedItemForTweet = item;
        
        // Style preview box matching the category
        tweetModalBadge.className = `badge`;
        tweetModalBadge.classList.add(item.categoryClass);
        tweetModalBadge.textContent = item.category;
        
        tweetModalDate.textContent = item.date;
        tweetModalPreviewText.textContent = item.contentText;

        // Generate formatted pre-populated tweet text
        const baseHeader = `BigQuery Update (${item.date})\n🏷️ ${item.category}: `;
        const hashtags = `\n\n#BigQuery #GCP`;
        const linkStr = item.link ? `\n🔗 ${item.link}` : '';
        
        // Calculate remaining space for description
        // Max: 280 characters
        const reservedLength = baseHeader.length + hashtags.length + linkStr.length;
        const availableLength = 280 - reservedLength;

        let description = item.contentText;
        if (description.length > availableLength) {
            description = description.slice(0, availableLength - 4) + '...';
        }

        const initialTweetText = `${baseHeader}${description}${hashtags}${linkStr}`;
        tweetTextarea.value = initialTweetText;

        updateCharCount();
        
        // Show modal
        tweetModal.style.display = 'flex';
        tweetTextarea.focus();
        // Prevent background scrolling
        document.body.style.overflow = 'hidden';
    }

    function closeTweetModal() {
        tweetModal.style.display = 'none';
        selectedItemForTweet = null;
        document.body.style.overflow = '';
    }

    function updateCharCount() {
        const count = tweetTextarea.value.length;
        charCurrent.textContent = count;
        
        // Update character count colors
        charCurrent.className = ''; // reset
        if (count > 280) {
            charCurrent.classList.add('danger');
            btnSendTweet.disabled = true;
            btnSendTweet.style.opacity = '0.5';
            tweetWarningMsg.style.display = 'block';
        } else {
            if (count > 250) {
                charCurrent.classList.add('warning');
            }
            btnSendTweet.disabled = false;
            btnSendTweet.style.opacity = '1';
            tweetWarningMsg.style.display = 'none';
        }
    }

    function sendTweet() {
        const text = tweetTextarea.value;
        if (text.length > 280) return;
        
        const tweetUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(text)}`;
        window.open(tweetUrl, '_blank', 'noopener,noreferrer');
        closeTweetModal();
    }

    // --- Event Listeners ---

    // Refresh Button
    btnRefresh.addEventListener('click', loadFeed);

    // Search Box
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.trim();
        if (searchQuery.length > 0) {
            btnClearSearch.style.display = 'block';
        } else {
            btnClearSearch.style.display = 'none';
        }
        applyFiltersAndRender();
    });

    btnClearSearch.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        btnClearSearch.style.display = 'none';
        applyFiltersAndRender();
        searchInput.focus();
    });

    // Filter Chips
    filterChips.forEach(chip => {
        chip.addEventListener('click', () => {
            filterChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            currentFilter = chip.getAttribute('data-filter');
            applyFiltersAndRender();
        });
    });

    // Reset Filter Button
    btnResetFilters.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        btnClearSearch.style.display = 'none';
        
        filterChips.forEach(c => c.classList.remove('active'));
        document.querySelector('[data-filter="all"]').classList.add('active');
        currentFilter = 'all';
        
        applyFiltersAndRender();
    });

    // Retry Button (Error state)
    btnRetry.addEventListener('click', loadFeed);

    // Modal Close handlers
    btnCloseModal.addEventListener('click', closeTweetModal);
    btnCancelTweet.addEventListener('click', closeTweetModal);
    
    // Clicking outside modal closes it
    tweetModal.addEventListener('click', (e) => {
        if (e.target === tweetModal) {
            closeTweetModal();
        }
    });

    // Handle ESC key to close modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && tweetModal.style.display === 'flex') {
            closeTweetModal();
        }
    });

    // Tweet Input event for character counting
    tweetTextarea.addEventListener('input', updateCharCount);

    // Send Tweet
    btnSendTweet.addEventListener('click', sendTweet);

    // Export to CSV
    btnExportCsv.addEventListener('click', () => {
        if (currentlyFilteredItems.length === 0) {
            alert('No items to export.');
            return;
        }

        const escapeCSV = (text) => {
            if (!text) return '""';
            return '"' + text.replace(/"/g, '""').replace(/\r?\n|\r/g, ' ') + '"';
        };

        // CSV Header
        const csvRows = [['Date', 'Category', 'Description', 'Link']];

        // CSV Body
        currentlyFilteredItems.forEach(item => {
            csvRows.push([
                item.date,
                item.category,
                item.contentText,
                item.link || ''
            ]);
        });

        // Convert to CSV string
        const csvContent = csvRows.map(row => row.map(escapeCSV).join(',')).join('\n');

        // Download CSV file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const timestamp = new Date().toISOString().split('T')[0];
        link.setAttribute('href', url);
        link.setAttribute('download', `bigquery_release_notes_${timestamp}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    // --- Init ---
    loadFeed();
});
