// Torii - X/Twitter Blockchain Intelligence Extension

// Check if ToriiAPI is defined
if (typeof ToriiAPI === 'undefined') {
    console.error('ToriiAPI is not defined. Make sure apiService.js is loaded before content.js');
    // Try to load it dynamically as a fallback
    try {
        const script = document.createElement('script');
        script.src = chrome.runtime.getURL('apiService.js');
        script.onload = () => {
            console.log('ToriiAPI loaded dynamically');
            initialize();
        };
        document.head.appendChild(script);
    } catch (e) {
        console.error('Failed to load ToriiAPI dynamically:', e);
    }
}

// Inject Tailwind CSS
function injectTailwindCSS() {
    const tailwindLink = document.createElement('link');
    tailwindLink.href = 'https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css';
    tailwindLink.rel = 'stylesheet';
    document.head.appendChild(tailwindLink);
}

// Main Features configuration
const FEATURES = [
    {
        id: 'ca-detection',
        name: 'Contracts',
        description: 'Even from deleted addresses, Torii finds contracts posted by users and projects.',
        icon: '📊',
        color: 'bg-purple-500'
    },
    {
        id: 'username-history',
        name: 'Username History',
        description: 'Follow every name change, from day one.',
        icon: '🏷️',
        color: 'bg-blue-500'
    },
    {
        id: 'bio-history',
        name: 'Bio Changes',
        description: 'See how a project or user\'s messaging evolves over time.',
        icon: '📝',
        color: 'bg-green-500'
    },
    {
        id: 'first-followers',
        name: 'First Followers',
        description: 'Discover who first supported a project.',
        icon: '👥',
        color: 'bg-yellow-500'
    },
    {
        id: 'key-followers',
        name: 'Key Followers',
        description: 'Using our own custom scoring system, Torii highlights the most important followers and contributors based on their relevance and influence.',
        icon: '⭐',
        color: 'bg-orange-500'
    }
];

// Simple cache for API responses - persist between modal sessions
// Username -> { featureId -> { data, timestamp } }
const dataCache = {};

// Track last active tab for each username
const userTabStates = {};

// Cache duration in milliseconds (30 minutes)
const CACHE_DURATION = 30 * 60 * 1000;

// Helper function to safely get asset URL
function getAssetUrl(path) {
    try {
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
            return chrome.runtime.getURL(path);
        }
    } catch (e) {
        console.warn('Error accessing chrome.runtime.getURL:', e);
    }
    // Fallback to relative path if chrome.runtime is not available
    return path;
}

// Inject button into profile page
function addToriiButton() {
    // Check if we're on a profile page and button doesn't already exist
    if (!window.location.pathname.match(/\/[^/]+$/) || document.querySelector('.torii-btn')) {
        return;
    }

    // Try to find the exact container specified by user
    const specificContainer = document.querySelector(
        'div.css-175oi2r.r-obd0qt.r-18u37iz.r-1w6e6rj.r-1h0z5md.r-dnmrzs'
    );
    
    // If we can't find the specific container, use a fallback
    if (!specificContainer) {
        // Try a broader selector that might match
        const fallbackContainer = document.querySelector('[data-testid="userActions"]')?.closest('div')?.parentElement;
        if (!fallbackContainer) return;
        
        console.log('Using fallback container for Torii button');
        insertToriiButton(fallbackContainer);
    } else {
        console.log('Found specific container for Torii button');
        insertToriiButton(specificContainer);
    }
    
    // Helper function to create and insert the button
    function insertToriiButton(container) {
        // Create the Torii button to match Twitter/X's UI
        const button = document.createElement('button');
        button.title = 'Analyze with Torii';
        
        // Add Twitter/X button styling
        button.setAttribute('role', 'button');
        button.style.borderColor = 'rgb(207, 217, 222)';
        button.style.backgroundColor = 'rgba(0, 0, 0, 0)';
        button.className = 'css-175oi2r r-sdzlij r-1phboty r-rs99b7 r-lrvibr r-6gpygo r-1wron08 r-2yi16 r-1qi8awa r-1loqt21 r-o7ynqc r-6416eg r-1ny4l3l torii-btn';

        // Create the icon
        const icon = document.createElement('img');
        icon.src = getAssetUrl('/assets/raw.png');
        icon.alt = 'Torii';
        icon.className = 'torii-icon';

        // Assemble button
        button.appendChild(icon);
        
        // Insert button at the beginning of the container (first button in the row)
        if (container.firstChild) {
            container.insertBefore(button, container.firstChild);
        } else {
            container.appendChild(button);
        }
        
        // Add click event to open modal
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            const username = window.location.pathname.slice(1);
            openToriiModal(username);
        });
    }
}

// Create and open the main Torii modal
function openToriiModal(username) {
    // Prevent multiple modals
    closeAllModals();
    
    // Create modal container with backdrop
    const modalContainer = document.createElement('div');
    modalContainer.className = 'torii-modal-container fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm flex items-center justify-center z-50';
    modalContainer.dataset.username = username;
    
    // Create modal
    const modal = document.createElement('div');
    modal.className = 'torii-modal relative glass-bg rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col text-black';
    
    // Modal header
    const header = document.createElement('div');
    header.className = 'flex items-center justify-between p-4 border-b border-gray-200 bg-opacity-90';
    
    // Logo and title
    const logoContainer = document.createElement('div');
    logoContainer.className = 'flex items-center space-x-3';
    
    const logo = document.createElement('img');
    logo.src = getAssetUrl('/assets/raw.png');
    logo.className = 'w-8 h-8 rounded-full';
    
    const title = document.createElement('h2');
    title.className = 'text-black font-bold text-lg';
    title.textContent = `Torii Analysis: @${username}`;
    
    logoContainer.appendChild(logo);
    logoContainer.appendChild(title);
    
    // Close button
    const closeButton = document.createElement('button');
    closeButton.className = 'text-gray-600 hover:text-black p-1 rounded-full hover:bg-gray-200 transition-colors keyboard-focus';
    closeButton.setAttribute('aria-label', 'Close');
    closeButton.innerHTML = '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>';
    closeButton.addEventListener('click', () => {
        // Save the active tab before closing
        const activeTab = document.querySelector('.feature-item[aria-selected="true"]');
        if (activeTab) {
            userTabStates[username] = activeTab.dataset.feature;
        }
        closeAllModals();
    });
    
    header.appendChild(logoContainer);
    header.appendChild(closeButton);
    
    // Top navigation (horizontal) instead of sidebar
    const navigation = document.createElement('div');
    navigation.className = 'navigation-container flex justify-center overflow-x-auto border-b border-gray-200 bg-white bg-opacity-50 py-3 px-4';
    navigation.setAttribute('role', 'tablist');
    navigation.setAttribute('aria-label', 'Features');
    
    // Inner container for nicer styling
    const navInner = document.createElement('div');
    navInner.className = 'inline-flex rounded-lg bg-gray-100 bg-opacity-50 p-1';
    navigation.appendChild(navInner);
    
    // Content area - create this before tabs so we can reference it
    const contentArea = document.createElement('div');
    contentArea.className = 'flex-1 overflow-y-auto glass-bg p-6';
    contentArea.setAttribute('role', 'tabpanel');
    
    // Initialize data cache for this username if not exists
    if (!dataCache[username]) {
        dataCache[username] = {};
    }
    
    // Get the previously active feature ID or default to first one
    let activeFeatureId = userTabStates[username] || FEATURES[0].id;
    
    // Feature tabs
    FEATURES.forEach((feature) => {
        const featureTab = document.createElement('button');
        
        // Check if this feature should be active
        const isActive = feature.id === activeFeatureId;
        
        featureTab.className = `feature-item px-3 py-1 flex items-center space-x-1 cursor-pointer ${isActive ? 'active bg-white shadow-sm text-blue-600' : 'text-gray-700 hover:text-blue-600'} transition-colors rounded-lg whitespace-nowrap keyboard-focus`;
        featureTab.dataset.feature = feature.id;
        featureTab.setAttribute('role', 'tab');
        featureTab.setAttribute('aria-selected', isActive ? 'true' : 'false');
        featureTab.setAttribute('tabindex', isActive ? '0' : '-1');
        featureTab.setAttribute('id', `tab-${feature.id}`);
        featureTab.setAttribute('aria-controls', `panel-${feature.id}`);
        
        // Change from data-tooltip to a manual tooltip div for better z-index control
        const tooltip = document.createElement('div');
        tooltip.className = 'custom-tooltip';
        tooltip.textContent = feature.description;
        featureTab.appendChild(tooltip);
        
        const featureIcon = document.createElement('span');
        featureIcon.className = 'text-xl';
        featureIcon.textContent = feature.icon;
        featureIcon.setAttribute('aria-hidden', 'true');
        
        const featureName = document.createElement('span');
        featureName.className = 'font-medium text-xs';
        featureName.textContent = feature.name;
        
        featureTab.appendChild(featureIcon);
        featureTab.appendChild(featureName);
        
        // Set up contentArea for active tab
        if (isActive) {
            contentArea.setAttribute('id', `panel-${feature.id}`);
            contentArea.setAttribute('aria-labelledby', `tab-${feature.id}`);
        }
        
        featureTab.addEventListener('click', () => {
            // Prevent triggering if already active
            if (featureTab.getAttribute('aria-selected') === 'true') {
                return;
            }
            
            // Remove active state from all tabs
            document.querySelectorAll('.feature-item').forEach(item => {
                item.classList.remove('active', 'bg-white', 'shadow-sm', 'text-blue-600');
                item.classList.add('text-gray-700');
                item.setAttribute('aria-selected', 'false');
                item.setAttribute('tabindex', '-1');
            });
            
            // Add active state to clicked tab
            featureTab.classList.add('active', 'bg-white', 'shadow-sm', 'text-blue-600');
            featureTab.classList.remove('text-gray-700');
            featureTab.setAttribute('aria-selected', 'true');
            featureTab.setAttribute('tabindex', '0');
            
            // Update tabpanel attributes
            contentArea.setAttribute('id', `panel-${feature.id}`);
            contentArea.setAttribute('aria-labelledby', `tab-${feature.id}`);
            
            // Update active feature ID and save it in state
            activeFeatureId = feature.id;
            userTabStates[username] = activeFeatureId;
            
            // Load feature content
            loadFeatureContent(feature.id, username, contentArea);
        });
        
        navInner.appendChild(featureTab);
    });
    
    // Add keyboard navigation
    navigation.addEventListener('keydown', (e) => {
        const tabs = Array.from(navigation.querySelectorAll('.feature-item'));
        const index = tabs.findIndex(tab => tab.getAttribute('aria-selected') === 'true');
        
        let newIndex;
        if (e.key === 'ArrowRight') {
            newIndex = (index + 1) % tabs.length;
        } else if (e.key === 'ArrowLeft') {
            newIndex = (index - 1 + tabs.length) % tabs.length;
        } else {
            return;
        }
        
        tabs[newIndex].click();
        tabs[newIndex].focus();
        e.preventDefault();
    });
    
    // Assemble modal
    modal.appendChild(header);
    modal.appendChild(navigation);
    modal.appendChild(contentArea);
    
    // Add modal to container
    modalContainer.appendChild(modal);
    
    // Add to page
    document.body.appendChild(modalContainer);
    
    // Close when clicking outside
    modalContainer.addEventListener('click', (e) => {
        if (e.target === modalContainer) {
            // Save active tab state before closing
            const activeTab = document.querySelector('.feature-item[aria-selected="true"]');
            if (activeTab) {
                userTabStates[username] = activeTab.dataset.feature;
            }
            closeAllModals();
        }
    });
    
    // Handle escape key to close modal
    const escapeHandler = (e) => {
        if (e.key === 'Escape') {
            // Save active tab state before closing
            const activeTab = document.querySelector('.feature-item[aria-selected="true"]');
            if (activeTab) {
                userTabStates[username] = activeTab.dataset.feature;
            }
            closeAllModals();
            document.removeEventListener('keydown', escapeHandler);
        }
    };
    document.addEventListener('keydown', escapeHandler);
    
    // Focus first tab for keyboard navigation
    setTimeout(() => {
        const activeTab = document.querySelector('.feature-item[aria-selected="true"]');
        if (activeTab) {
            activeTab.focus();
        }
        
        // Load initial feature content for the active tab
        loadFeatureContent(activeFeatureId, username, contentArea);
    }, 100);
}

// Load feature content
function loadFeatureContent(featureId, username, contentArea) {
    // Check if data is in cache and not expired
    if (dataCache[username] && 
        dataCache[username][featureId] && 
        (Date.now() - dataCache[username][featureId].timestamp < CACHE_DURATION)) {
        
        console.log(`Using cached data for @${username} - ${featureId}`);
        
        // Use cached data if available and recent
        renderFeatureContent(featureId, username, contentArea, dataCache[username][featureId].data);
        return;
    }
    
    // Show loading state
    contentArea.innerHTML = `
        <div class="flex items-center justify-center h-full">
            <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
    `;
    
    // Set tab loading indicator
    contentArea.dataset.loading = 'true';
    
    // Real API calls
    let apiPromise;
    switch (featureId) {
        case 'ca-detection':
            apiPromise = ToriiAPI.getContractTweets(username);
            break;
        case 'username-history':
            apiPromise = ToriiAPI.getPastUsernames(username);
            break;
        case 'bio-history':
            apiPromise = ToriiAPI.getBioHistory(username);
            break;
        case 'first-followers':
            apiPromise = ToriiAPI.getFirstFollowers(username);
            break;
        case 'key-followers':
            apiPromise = ToriiAPI.getScoredFollowers(username);
            break;
        default:
            contentArea.innerHTML = `<div class="text-center text-gray-400">Feature not implemented yet</div>`;
            return;
    }
    
    // Process API data
    apiPromise.then(data => {
        // Cache the data
        if (!dataCache[username]) {
            dataCache[username] = {};
        }
        dataCache[username][featureId] = {
            data: data,
            timestamp: Date.now()
        };
        
        // Store in session storage as backup
        try {
            // We'll store a small marker to indicate the cache exists
            sessionStorage.setItem(`torii_cache_${username}`, 'true');
        } catch (e) {
            console.warn('Could not store cache indicator in sessionStorage', e);
        }
        
        // Only render if this is still the active tab
        const activeFeatureId = document.querySelector('.feature-item[aria-selected="true"]')?.dataset.feature;
        if (activeFeatureId === featureId) {
            renderFeatureContent(featureId, username, contentArea, data);
        }
    })
    .catch(error => {
        console.error(`Error fetching ${featureId} data:`, error);
        // Only render error if this is still the active tab
        const activeFeatureId = document.querySelector('.feature-item[aria-selected="true"]')?.dataset.feature;
        if (activeFeatureId === featureId) {
            renderErrorState(contentArea, `Failed to load ${getFeatureName(featureId)}`, username, featureId);
        }
    })
    .finally(() => {
        // Clear loading state
        contentArea.dataset.loading = 'false';
    });
}

// Helper function to get feature name from ID
function getFeatureName(featureId) {
    const feature = FEATURES.find(f => f.id === featureId);
    return feature ? feature.name : featureId;
}

// Render feature content based on feature ID
function renderFeatureContent(featureId, username, contentArea, data) {
    switch (featureId) {
        case 'ca-detection':
            renderCADetection(username, contentArea, data);
            break;
        case 'username-history':
            renderUsernameHistory(username, contentArea, data);
            break;
        case 'bio-history':
            renderBioHistory(username, contentArea, data);
            break;
        case 'first-followers':
            renderFirstFollowers(username, contentArea, data);
            break;
        case 'key-followers':
            renderKeyFollowers(username, contentArea, data);
            break;
        default:
            contentArea.innerHTML = `<div class="text-center text-gray-400">Feature not implemented yet</div>`;
    }
}

// Helper function to render error state
function renderErrorState(container, message, username, featureId) {
    container.innerHTML = `
        <div class="flex flex-col items-center justify-center h-full">
            <div class="text-red-500 mb-3">
                <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
            </div>
            <div class="text-gray-700 text-center">${message}</div>
            <button class="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors retry-button">
                Try Again
            </button>
        </div>
    `;

    // Add retry button functionality
    const retryButton = container.querySelector('.retry-button');
    if (retryButton && username && featureId) {
        // Remove any existing event listeners
        const newRetryButton = retryButton.cloneNode(true);
        retryButton.parentNode.replaceChild(newRetryButton, retryButton);
        
        // Clear cache for this feature
        if (dataCache[username] && dataCache[username][featureId]) {
            delete dataCache[username][featureId];
        }
        
        // Add new event listener
        newRetryButton.addEventListener('click', () => {
            loadFeatureContent(featureId, username, container);
        });
    }
}

// Feature renderers
function renderCADetection(username, container, data) {
    container.innerHTML = `
        <div class="space-y-6">
            <div class="flex items-center justify-between">
                <h3 class="text-2xl font-bold text-gray-800">Contract Address Detection</h3>
                <span class="px-3 py-1 bg-purple-500 bg-opacity-20 text-purple-700 rounded-full text-sm">Last updated: Just now</span>
            </div>
            
            <p class="text-gray-700">We found <strong>${data.contracts.length} contract addresses</strong> posted by @${username}, including ${data.deletedContracts.length} in deleted tweets.</p>
            
            <div class="space-y-4">
                ${data.contracts.length > 0 ? data.contracts.map(contract => `
                <div class="contract-card">
                    <div class="contract-header">
                        <span class="font-medium">
                            ${contract.deleted ? '<span class="text-orange-400">[DELETED]</span> ' : ''}
                            Tweet • ${contract.date}
                        </span>
                        <div class="flex items-center">
                            <span class="px-2 py-1 mr-2 bg-${contract.blockchain === 'Ethereum' ? 'blue' : 'purple'}-500 bg-opacity-30 text-${contract.blockchain === 'Ethereum' ? 'blue' : 'purple'}-800 rounded text-xs">${contract.blockchain}</span>
                        </div>
                    </div>
                    <div class="contract-body">
                        ${contract.message ? `
                        <div class="tweet-message mb-3 text-gray-300 p-3 bg-gray-800 bg-opacity-50 rounded">
                            ${contract.deleted ? '<div class="text-orange-400 text-xs mb-1">This tweet has been deleted but was captured by Torii.</div>' : ''}
                            ${contract.message}
                        </div>` : ''}
                        <div class="contract-address">${contract.address}</div>
                        <div class="contract-actions">
                            <a href="${contract.etherscanLink}" target="_blank" class="action-link" data-tooltip="View contract details on ${contract.blockchain === 'Ethereum' ? 'Etherscan' : 'Solscan'}">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                                View on ${contract.blockchain === 'Ethereum' ? 'Etherscan' : 'Solscan'}
                            </a>
                            <a href="${contract.tweetLink}" target="_blank" class="action-link" data-tooltip="View the original tweet${contract.deleted ? ' (Note: This tweet was deleted and may no longer be accessible)' : ''}">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"></path></svg>
                                ${contract.deleted ? 'View Deleted Tweet' : 'View Original Tweet'}
                            </a>
                        </div>
                    </div>
                </div>
                `).join('') : '<div class="text-center text-gray-500 py-10">No contract addresses found</div>'}
            </div>
        </div>
    `;
}

function renderUsernameHistory(username, container, data) {
    container.innerHTML = `
        <div class="space-y-6">
            <div class="flex items-center justify-between">
                <h3 class="text-2xl font-bold text-gray-800">Username History</h3>
                <span class="px-3 py-1 bg-blue-500 bg-opacity-20 text-blue-700 rounded-full text-sm">${data.changes.length} changes detected</span>
            </div>
            
            <div class="overflow-x-auto">
                <table class="w-full text-left">
                    <thead class="bg-gray-100 text-gray-700">
                        <tr>
                            <th class="px-4 py-3 rounded-tl-lg">Username</th>
                            <th class="px-4 py-3">Changed On</th>
                            <th class="px-4 py-3">Duration</th>
                            <th class="px-4 py-3 rounded-tr-lg">Notes</th>
                        </tr>
                    </thead>
                    <tbody class="text-gray-700 divide-y divide-gray-200">
                        ${data.changes.length > 0 ? data.changes.map(change => `
                        <tr class="bg-${change.riskLevel.toLowerCase()}-500 bg-opacity-10">
                            <td class="px-4 py-3 font-medium">@${change.username}</td>
                            <td class="px-4 py-3">${change.date}</td>
                            <td class="px-4 py-3">${change.duration}</td>
                            <td class="px-4 py-3 text-${change.riskLevel.toLowerCase()}-600">${change.notes}</td>
                        </tr>
                        `).join('') : `
                        <tr>
                            <td colspan="4" class="px-4 py-8 text-center text-gray-500">No username changes detected</td>
                        </tr>`}
                    </tbody>
                </table>
            </div>
            
            <div>
                <h4 class="text-gray-800 font-medium mb-2">Analysis</h4>
                <div class="bg-gray-100 rounded-lg p-4 text-gray-700">
                    <p>${data.analysis}</p>
                </div>
            </div>
        </div>
    `;
}

function renderBioHistory(username, container, data) {
    container.innerHTML = `
        <div class="space-y-6">
            <div class="flex items-center justify-between">
                <h3 class="text-2xl font-bold text-gray-800">Bio History</h3>
                <span class="px-3 py-1 bg-green-500 bg-opacity-20 text-green-700 rounded-full text-sm">${data.changes.length} changes detected</span>
            </div>
            
            <div class="space-y-4">
                ${data.changes.length > 0 ? data.changes.map(change => `
                <div class="bg-gray-100 rounded-lg p-4 border-l-4 border-${change.riskLevel.toLowerCase()}-500">
                    <div class="flex justify-between mb-2">
                        <span class="text-gray-800 font-medium">${change.type.charAt(0).toUpperCase() + change.type.slice(1)}</span>
                        <span class="text-gray-600 text-sm">${change.date}</span>
                    </div>
                    <div class="bg-gray-50 p-3 rounded text-gray-700">
                        ${change.text}
                    </div>
                    ${change.notes ? `<div class="mt-2 text-${change.riskLevel.toLowerCase()}-600 text-sm">
                        <span class="font-medium">Changes:</span><br>
                        ${change.notes.includes('Added:') ? `<span class="font-medium">Added:</span> ${change.notes.split('Added:')[1].split(', Removed:')[0]}<br>` : ''}
                        ${change.notes.includes('Removed:') ? `<span class="font-medium">Removed:</span> ${change.notes.split('Removed:')[1]}` : ''}
                    </div>` : ''}
                </div>
                `).join('') : '<div class="text-center text-gray-500 py-10">No bio changes detected</div>'}
            </div>
            
            <div>
                <h4 class="text-gray-800 font-medium mb-2">Keywords Analysis</h4>
                <div class="flex flex-wrap gap-2">
                    ${data.keywords.length > 0 ? data.keywords.map(keyword => `<span class="px-3 py-1 bg-${keyword.riskLevel.toLowerCase()}-500 bg-opacity-20 text-${keyword.riskLevel.toLowerCase()}-700 rounded-full text-sm">${keyword.text}</span>`).join('') : '<span class="text-gray-500">No significant keywords found</span>'}
                </div>
            </div>
        </div>
    `;
}

function renderFirstFollowers(username, container, data) {
    container.innerHTML = `
        <div class="space-y-6">
            <div class="flex items-center justify-between">
                <h3 class="text-2xl font-bold text-gray-800">First Followers Analysis</h3>
                <span class="px-3 py-1 bg-yellow-500 bg-opacity-20 text-yellow-700 rounded-full text-sm">Account created ${data.creationDate}</span>
            </div>
            
            <p class="text-gray-700">First followers often reveal networks and connections. Here are @${username}'s first ${data.followers.length} followers:</p>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                ${data.followers.length > 0 ? data.followers.map(follower => `
                <div class="bg-gray-100 rounded-lg p-3 flex items-center space-x-3 border border-gray-200">
                    <div class="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center text-xl">
                        👤
                    </div>
                    <div class="flex-1">
                        <div class="text-gray-800 font-medium">@${follower.username}</div>
                        <div class="text-gray-600 text-sm">Followed on ${follower.date}</div>
                    </div>
                    ${follower.riskLevel ? `<span class="px-2 py-1 bg-${follower.riskLevel.toLowerCase()}-500 bg-opacity-20 text-${follower.riskLevel.toLowerCase()}-700 rounded text-xs">${follower.riskLevel.charAt(0).toUpperCase() + follower.riskLevel.slice(1)}</span>` : ''}
                </div>
                `).join('') : '<div class="col-span-2 text-center text-gray-500 py-10">No follower data available</div>'}
            </div>
        </div>
    `;
}

function renderKeyFollowers(username, container, data) {
    container.innerHTML = `
        <div class="space-y-6">
            <div class="flex items-center justify-between">
                <h3 class="text-2xl font-bold text-gray-800">Key Followers Analysis</h3>
                <span class="px-3 py-1 bg-orange-500 bg-opacity-20 text-orange-700 rounded-full text-sm">${data.followers.length} key followers identified</span>
            </div>
            
            <p class="text-gray-700">Key followers are accounts with high follower counts and influence scores.</p>
            
            <div class="space-y-6 mt-6">
                ${data.followers.length > 0 ? data.followers.map(follower => `
                <div class="flex items-start">
                    <div class="text-2xl text-yellow-400 mr-4">
                        ⭐
                    </div>
                    <div>
                        <div class="flex items-center gap-3">
                            <span class="text-white font-bold">@${follower.username}</span>
                            <span class="text-gray-300 text-sm">${Math.round(Number(follower.description.split(': ')[1]))} points</span>
                        </div>
                        <div class="text-gray-300 mt-1">
                            ${follower.followers} followers
                        </div>
                    </div>
                </div>
                `).join('') : '<div class="text-center text-gray-500 py-10">No key followers identified</div>'}
            </div>
        </div>
    `;
}

// Helper functions
function closeAllModals() {
    // All the modals will be removed but the cache remains intact
    const modals = document.querySelectorAll('.torii-modal-container');
    modals.forEach(modal => {
        // Get username before removing modal
        const username = modal.dataset.username;
        if (username) {
            // Save active tab state
            const activeTab = modal.querySelector('.feature-item[aria-selected="true"]');
            if (activeTab) {
                userTabStates[username] = activeTab.dataset.feature;
            }
        }
        modal.remove();
    });
}

// Initialize the extension
function initialize() {
    // Ensure ToriiAPI is available
    if (typeof ToriiAPI === 'undefined') {
        console.error('ToriiAPI is still not defined. Extension functionality will be limited.');
        return;
    }
    
    console.log('Initializing Torii extension');
    injectTailwindCSS();
    
    // Twitter's UI is highly dynamic, so we need aggressive checking
    const checkForProfilePage = () => {
        // If we're on a profile page, add the button
        if (window.location.pathname.match(/\/[^/]+$/) && !document.querySelector('.torii-btn')) {
            addToriiButton();
        }
    };
    
    // Check immediately
    checkForProfilePage();
    
    // Create a MutationObserver to watch for page changes
    const observer = new MutationObserver((mutations) => {
        // Only check when mutations contain added nodes or the URL has changed
        if (mutations.some(m => m.addedNodes.length > 0) || 
            observer.lastURL !== window.location.href) {
            observer.lastURL = window.location.href;
            checkForProfilePage();
        }
    });
    
    // Keep track of the current URL
    observer.lastURL = window.location.href;
    
    // Start observing the document with the configured parameters
    observer.observe(document.body, { childList: true, subtree: true });
    
    // Also check when URL changes through history API
    window.addEventListener('popstate', checkForProfilePage);
    
    // Check periodically as a fallback
    setInterval(checkForProfilePage, 2000);
}

// Initialize when DOM is fully loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    // DOM is already loaded, initialize now
    initialize();
} 

