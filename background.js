// Torii - Web3 Intelligence Extension Background Script
const API_BASE_URL = 'https://api.toriiprotocol.xyz/v1/';

// Initialize extension when installed
chrome.runtime.onInstalled.addListener(() => {
    console.log('Torii Extension installed');
    
    // Initialize storage with empty rate limit trackers
    chrome.storage.local.set({
        'lastApiCalls': {},
        'settings': {
            'apiBaseUrl': API_BASE_URL
        }
    });
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'scanRequest') {
        handleScanRequest(request.scanType, request.username)
            .then(result => sendResponse(result))
            .catch(error => sendResponse({ error: true, message: error.message }));
        return true; // Indicates we want to send a response asynchronously
    }
    
    if (request.action === 'checkRateLimit') {
        checkRateLimit(request.scanType)
            .then(result => sendResponse(result))
            .catch(error => sendResponse({ error: true, message: error.message }));
        return true;
    }
});

// Handle API scan requests
async function handleScanRequest(scanType, username) {
    try {
        // Check rate limit first
        const rateLimitCheck = await checkRateLimit(scanType);
        if (rateLimitCheck.rate_limited) {
            return rateLimitCheck;
        }
        
        // Map scan type to API endpoint
        const endpoint = getScanEndpoint(scanType);
        if (!endpoint) {
            throw new Error('Invalid scan type');
        }
        
        // Get API base URL from settings
        const settings = await chrome.storage.local.get('settings');
        const apiBaseUrl = settings.settings?.apiBaseUrl || API_BASE_URL;
        
        // For now, return mock data based on the scan type
        const mockData = generateMockData(scanType, username);
        await recordApiCall(scanType);
        
        return mockData;
        
        // When API is ready, use this instead:
        /*
        const response = await fetch(`${apiBaseUrl}/${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username,
            }),
            credentials: 'omit',
            mode: 'cors'
        });
        
        if (!response.ok) {
            throw new Error(`Server responded with status: ${response.status}`);
        }
        
        const result = await response.json();
        
        // Update last API call timestamp
        await recordApiCall(scanType);
        
        return result;
        */
    } catch (error) {
        console.error('Torii API error:', error);
        return {
            error: true,
            message: error.message,
            data: null
        };
    }
}

// Generate mock data for demo purposes
function generateMockData(scanType, username) {
    // This function simulates API responses during development
    // It should be replaced with actual API calls in production
    
    const mockResponses = {
        'ca-detection': {
            success: true,
            data: {
                detected_contracts: [
                    {
                        address: '0x7a250d5630b4cf539739df2c5dacb4c659f2488d',
                        tweet_status: 'deleted',
                        date: '2023-03-12',
                        risk_level: 'high'
                    },
                    {
                        address: '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984',
                        tweet_status: 'active',
                        date: '2023-02-03',
                        risk_level: 'medium'
                    },
                    {
                        address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
                        tweet_status: 'active',
                        date: '2023-01-17',
                        risk_level: 'low'
                    }
                ]
            }
        },
        'username-history': {
            success: true,
            data: {
                username_changes: [
                    {
                        username: username,
                        date: '2023-04-17',
                        days_active: 'current',
                        note: 'Current username'
                    },
                    {
                        username: `${username}_eth`,
                        date: '2023-03-05',
                        days_active: '43',
                        note: ''
                    },
                    {
                        username: `defi_${username}`,
                        date: '2023-01-12',
                        days_active: '52',
                        note: ''
                    },
                    {
                        username: `${username}_nft`,
                        date: '2022-10-30',
                        days_active: '74',
                        note: ''
                    },
                    {
                        username: `original_${username}`,
                        date: '2022-06-15',
                        days_active: '137',
                        note: 'First recorded username'
                    }
                ],
                analysis: 'Username changes every 1-3 months may indicate brand repositioning or attempts to rebrand after controversial activities. The most recent username has been stable for over 6 months.'
            }
        },
        'bio-history': {
            success: true,
            data: {
                bio_changes: [
                    {
                        bio: 'Web3 enthusiast | Building @ToriiProtocol | Previously @BigTechCo',
                        date_range: 'Since May 3, 2023',
                        is_current: true
                    },
                    {
                        bio: 'Building something special | Follow for alpha | DMs open for collabs',
                        date_range: 'Mar 12 - May 2, 2023',
                        is_current: false,
                        changes: 'Removed "Follow for alpha" and "DMs open for collabs"'
                    },
                    {
                        bio: 'Going all in on DeFi | Early investor in $XYZ | Not financial advice',
                        date_range: 'Jan 15 - Mar 11, 2023',
                        is_current: false,
                        changes: 'Complete rewrite'
                    }
                ],
                remaining_changes: 4,
                keywords: [
                    { word: 'Web3', category: 'neutral' },
                    { word: 'DeFi', category: 'neutral' },
                    { word: 'Builder', category: 'neutral' },
                    { word: 'Alpha', category: 'caution' },
                    { word: 'Investment', category: 'caution' },
                    { word: 'Not financial advice', category: 'warning' }
                ]
            }
        },
        'first-followers': {
            success: true,
            data: {
                account_created: 'June 15, 2022',
                first_followers: Array(10).fill(0).map((_, i) => ({
                    username: `follower${i+1}`,
                    followed_on: `June ${16+i}, 2022`,
                    is_suspicious: Math.random() > 0.7
                })),
                analysis: {
                    summary: '3 of the first followers are connected to known projects with rugpull history.',
                    pattern: '5 followers show a pattern of following accounts shortly before major token announcements.'
                }
            }
        },
        'contract-analysis': {
            success: true,
            data: {
                high_risk_count: 2,
                contracts: [
                    {
                        address: '0x7a250d5630b4cf539739df2c5dacb4c659f2488d',
                        risk_level: 'high',
                        type: 'Honeypot Contract',
                        issues: [
                            'Buy function works, but sell function has blocked transfers',
                            'Owner can disable all transfers except their own',
                            'Hidden fee structure that takes up to 99% on certain transactions'
                        ]
                    },
                    {
                        address: '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984',
                        risk_level: 'medium',
                        type: 'Suspicious Ownership',
                        issues: [
                            'Owner can change fee structure without limits',
                            'No timelock for critical parameter changes',
                            'Ownership can be transferred without notice'
                        ]
                    }
                ]
            }
        },
        'token-distribution': {
            success: true,
            data: {
                suspicious_transfers: 3,
                recent_movements: [
                    {
                        from: '0x7a250d5630b4cf539739df2c5dacb4c659f2488d',
                        to: '0xb24f8c1daea66183a2286f23a3b9c5189d5db39a',
                        amount: '5,000,000',
                        token: 'XYZ',
                        value_usd: '1,200,000',
                        days_ago: 2,
                        risk_level: 'high',
                        notes: 'Founder wallet transferred 25% of token supply to Binance hot wallet before price drop'
                    },
                    {
                        from: '0x1c93846d9c730133d4601c722a548e8d3d7d74e',
                        to: 'Multiple wallets (12)',
                        amount: '2,500,000',
                        token: 'XYZ',
                        value_usd: '600,000',
                        days_ago: 5,
                        risk_level: 'medium',
                        notes: 'Team wallet distributed tokens to multiple new wallets in similar amounts'
                    },
                    {
                        from: '0x9e75d9600c12bfabb5f2adaed6d73a1c',
                        to: '0x7a250d5630b4cf539739df2c5dacb4c659f2488d',
                        amount: '1,000,000',
                        token: 'XYZ',
                        value_usd: '240,000',
                        days_ago: 14,
                        risk_level: 'medium',
                        notes: 'Early investor transferred back to founder wallet after vesting period'
                    }
                ],
                distribution: [
                    { group: 'Team & Founders', percentage: 45 },
                    { group: 'Early Investors', percentage: 30 },
                    { group: 'Community & Public', percentage: 25 }
                ]
            }
        }
    };
    
    return {
        success: true,
        data: mockResponses[scanType]?.data || { error: 'No mock data available' }
    };
}

// Map scan type to API endpoint
function getScanEndpoint(scanType) {
    const endpoints = {
        'ca-detection': 'twitter/ca-detection',
        'username-history': 'twitter/username-history',
        'bio-history': 'twitter/bio-history',
        'first-followers': 'twitter/first-followers',
        'contract-analysis': 'contract/analysis',
        'token-distribution': 'token/distribution'
    };
    
    return endpoints[scanType];
}

// Record API call timestamp for rate limiting
async function recordApiCall(scanType) {
    const storage = await chrome.storage.local.get('lastApiCalls');
    const lastApiCalls = storage.lastApiCalls || {};
    
    lastApiCalls[scanType] = Date.now();
    
    await chrome.storage.local.set({ lastApiCalls });
}

// Check if a request is within rate limit (5 min = 300000 ms)
async function checkRateLimit(scanType) {
    const RATE_LIMIT_MS = 300000; // 5 minutes in milliseconds
    
    const storage = await chrome.storage.local.get('lastApiCalls');
    const lastApiCalls = storage.lastApiCalls || {};
    
    if (!lastApiCalls[scanType]) {
        return { rate_limited: false };
    }
    
    const timeSinceLastCall = Date.now() - lastApiCalls[scanType];
    
    if (timeSinceLastCall < RATE_LIMIT_MS) {
        const remainingMinutes = Math.ceil((RATE_LIMIT_MS - timeSinceLastCall) / 60000);
        
        return {
            rate_limited: true,
            data: {
                message: `⏳ Rate Limit Notice:\n\nThis feature can only be used once every 5 minutes. You need to wait ${remainingMinutes} more minutes before using it again.\n\nIn the future, premium users will have unlimited access.\n\nThank you for your understanding!`
            }
        };
    }
    
    return { rate_limited: false };
} 