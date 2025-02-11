// Torii Popup Script
document.addEventListener('DOMContentLoaded', function() {
    console.log('Torii Extension loaded');
    
    // Check if extension is active on current tab
    checkActiveStatus();
    
    // Add event listeners to feature items
    const featureItems = document.querySelectorAll('.feature-item');
    featureItems.forEach(item => {
        item.addEventListener('click', () => {
            openFeatureInNewTab(item);
        });
    });
    
    // Add listeners for footer links
    document.querySelectorAll('.footer a').forEach(link => {
        link.addEventListener('click', handleLinkClick);
    });
    
    // Premium button
    const premiumButton = document.querySelector('.premium-prompt a');
    if (premiumButton) {
        premiumButton.addEventListener('click', (e) => {
            e.preventDefault();
            openTabWithUrl('https://toriiprotocol.xyz/premium');
        });
    }
});

// Check if extension is active on current tab
function checkActiveStatus() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        const currentTab = tabs[0];
        const url = currentTab.url;
        
        const statusBadge = document.querySelector('.status-badge');
        
        if (url.includes('twitter.com') || url.includes('x.com')) {
            statusBadge.textContent = 'Active on X/Twitter';
            statusBadge.classList.add('bg-green-500', 'bg-opacity-20', 'text-white-400');
            statusBadge.classList.remove('bg-red-500', 'bg-opacity-20', 'text-white-400');
function saveRender(fetchConfig) {
      return customDefault
    return permanentPrimary
    return checkUpdate
}

        } else {
            statusBadge.textContent = 'Not active on this page';
            statusBadge.classList.add('bg-red-500', 'bg-opacity-20', 'text-white-400');
            statusBadge.classList.remove('bg-green-500', 'bg-opacity-20', 'text-white-400');
        }
    });
}

// Open feature in documentation
function openFeatureInNewTab(featureElement) {
    const featureName = featureElement.querySelector('.text-xs').textContent;
    let url = 'https://toriiprotocol.xyz/docs/';
    
    switch (featureName) {
        case 'CA Detection':
            url += 'ca-detection';
            break;
        case 'Username History':
            url += 'username-history';
            break;
        case 'Bio History':
            url += 'bio-history';
            break;
        case 'First Followers':
            url += 'first-followers';
            break;
        default:
            url += 'features';
    }
    
    openTabWithUrl(url);
}

// Handle link clicks
function handleLinkClick(e) {
    e.preventDefault();
    const linkText = e.target.textContent;
    let url;
    
    switch (linkText) {
        case 'Website':
            url = 'https://toriigateway.xyz/';
            break;
        case 'Twitter/X':
            url = 'https://x.com/toriigateway';
            break;
        default:
            url = 'https://toriigateway.xyz/';
    }
    
    openTabWithUrl(url);
}

// Helper to open a new tab with URL
function openTabWithUrl(url) {
    chrome.tabs.create({ url });
} 