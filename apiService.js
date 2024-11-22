// Torii API Service
const API_BASE_URL = 'https://www.toriigateway.com';

/**
 * Helper function to make API requests
 * @param {string} endpoint - API endpoint
 * @param {object} data - Request payload
 * @returns {Promise<object>} - API response
 */
async function apiRequest(endpoint, data) {
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });
        
        if (!response.ok) {
            throw new Error(`API call failed: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error(`Error calling API endpoint ${endpoint}:`, error);
        throw error;
    }
}

/**
 * Get first followers for a user
 * @param {string} username - Twitter username
 * @param {number} page - Pagination page number
 * @returns {Promise<object>} - First followers data
 */
async function getFirstFollowers(username, page = 1) {
    const response = await apiRequest('/api/graph/get_first_followers', {
        user: username,
        how: 'username',
        page
    });

    // Transform API response to expected format for renderFirstFollowers
    const firstFollowersData = {
        followers: [],
        creationDate: "Unknown date",
        networkAnalysis: `We've analyzed @${username}'s earliest followers to identify potential connections and networks.`
    };

    // Process followers data if available
    if (response.data && Array.isArray(response.data)) {
        // Sort by follower sequence number (ascending)
        const sortedData = [...response.data].sort((a, b) => 
            a.follower_sequence_num - b.follower_sequence_num
        );
        
        // Try to estimate account creation date from earliest follower
        if (sortedData.length > 0) {
            const earliestFollower = sortedData.reduce((earliest, current) => 
                new Date(current.followed_at_timestamp) < new Date(earliest.followed_at_timestamp) ? 
                current : earliest, sortedData[0]);
                
            const creationDate = new Date(earliestFollower.followed_at_timestamp);
            firstFollowersData.creationDate = creationDate.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        }

        // Generate network analysis based on followers
        let influencerCount = 0;
        let projectCount = 0;
        
        // Process each follower and add to the result array
        sortedData.forEach(follower => {
            // Determine risk level based on score or other factors
            let riskLevel = "low";
            
            // If has score and it's high, mark as influencer
            if (follower.score && follower.score > 10) {
                riskLevel = "medium";
                influencerCount++;
            }
            
            // Check for project indicators in name or bio
            if (follower.list_name && 
                (/token|coin|nft|dao|defi|protocol|labs|finance|capital/i.test(follower.list_name))) {
                riskLevel = "high";
                projectCount++;
            }
            
            const followedDate = new Date(follower.followed_at_timestamp);
            
            firstFollowersData.followers.push({
                username: follower.username,
                date: followedDate.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                }),
                riskLevel: riskLevel
            });
        });
        
        // Create network analysis text based on what we found
        let analysisText = `@${username}'s first followers include `;
        
        if (influencerCount > 0) {
            analysisText += `${influencerCount} notable accounts `;
        }
        
        if (projectCount > 0) {
            analysisText += influencerCount > 0 ? `and ${projectCount} projects/protocols. ` : `${projectCount} projects/protocols. `;
        } else if (influencerCount > 0) {
            analysisText += ". ";
        } else {
            analysisText += "mostly regular users with no high-influence accounts. ";
        }
        
        analysisText += `The pattern suggests ${
            projectCount > 3 ? "strong connections within the Web3 ecosystem" : 
            influencerCount > 3 ? "good network connections but fewer project affiliations" :
            "a more organic audience growth pattern"}. `;
            
        firstFollowersData.networkAnalysis = analysisText;
    }

    return firstFollowersData;
}

/**
 * Get bio history for a user
 * @param {string} username - Twitter username
 * @param {number} page - Pagination page number
 * @returns {Promise<object>} - Bio history data
 */
async function getBioHistory(username, page = 1) {
    const response = await apiRequest('/api/metadata/get_bio_history', {
        user: username,
        how: 'username',
        page
    });

    // Transform API response to expected format for renderBioHistory
    const bioHistory = {
        changes: [],
        keywords: []
    };

    // Process bio data if available
    if (response.data && Array.isArray(response.data)) {
        // Filter out entries with no bio
        const validEntries = response.data.filter(entry => entry.bio);
        
        // Sort by date (most recent first)
        const sortedData = validEntries.sort((a, b) => 
            new Date(b.last_checked) - new Date(a.last_checked)
        );

        // Extract common keywords and suspicious terms
        const suspiciousTerms = [
            "airdrop", "free", "claim", "whitelist", "presale", "mint",
            "token", "exclusive", "hurry", "limited", "giveaway", "bot"
        ];
        
        const allBios = sortedData.map(entry => entry.bio).join(" ");
        const extractedKeywords = [];
        
        // Extract links
        const linkRegex = /(https?:\/\/[^\s]+)/g;
        const links = allBios.match(linkRegex) || [];
        if (links.length > 0) {
            links.forEach(link => {
                let riskLevel = "low";
                if (link.includes("t.me") || link.includes("telegram")) {
                    riskLevel = "medium";
                }
                extractedKeywords.push({ text: link, riskLevel });
            });
        }
        
        // Extract suspicious terms
        suspiciousTerms.forEach(term => {
            if (allBios.toLowerCase().includes(term.toLowerCase())) {
                extractedKeywords.push({ 
                    text: term, 
                    riskLevel: term === "bot" || term === "airdrop" ? "high" : "medium" 
                });
            }
        });
        
        // Add unique keywords to the output
        const uniqueKeywords = Array.from(new Set(extractedKeywords.map(k => k.text)))
            .map(text => extractedKeywords.find(k => k.text === text));
        
        bioHistory.keywords = uniqueKeywords;

        // Process each bio change
        for (let i = 0; i < sortedData.length; i++) {
            const current = sortedData[i];
            const next = sortedData[i + 1];
            
            const currentDate = new Date(current.last_checked);
            const formattedDate = currentDate.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
            
            let type = i === 0 ? "Current Bio" : "Bio Change";
            let riskLevel = "low";
            let notes = "";
            
            // Compare to next (previous) bio to detect changes
            if (next) {
                // Calculate days between changes
                const nextDate = new Date(next.last_checked);
                const diffInDays = Math.floor((currentDate - nextDate) / (1000 * 60 * 60 * 24));
                
                // Analyze change frequency
                if (diffInDays < 7) {
                    riskLevel = "high";
                    notes = "";
                } else if (diffInDays < 30) {
                    riskLevel = "medium";
                    notes = "";
                }
                
                // See what was added/removed
                if (current.bio !== next.bio) {
                    // Simple diff to highlight what changed
                    const added = current.bio.split("\n").filter(line => !next.bio.includes(line)).join(", ");
                    const removed = next.bio.split("\n").filter(line => !current.bio.includes(line)).join(", ");
                    
                    if (added) notes += added ? `Added: ${added}` : "";
                    if (removed) notes += removed ? (notes ? ", Removed: " : "Removed: ") + removed : "";
                    
                    // Check for suspicious term additions
                    suspiciousTerms.forEach(term => {
                        if (current.bio.toLowerCase().includes(term.toLowerCase()) && 
                            !next.bio.toLowerCase().includes(term.toLowerCase())) {
                            riskLevel = "high";
                            notes += notes ? `, Added: ${term}` : `Added: ${term}`;
                        }
                    });
                }
            }
            
            bioHistory.changes.push({
                text: current.bio,
                date: formattedDate,
                type: type,
                notes: notes,
                riskLevel: riskLevel
            });
        }
    }

    return bioHistory;
}

/**
 * Get username history for a user
 * @param {string} username - Twitter username
 * @param {number} page - Pagination page number
 * @returns {Promise<object>} - Username history data
 */
async function getPastUsernames(username, page = 1) {
    const response = await apiRequest('/api/metadata/get_past_usernames', {
        user: username,
        how: 'username',
        page
    });

    // Transform API response to expected format for renderUsernameHistory
    const usernameHistory = {
        changes: [],
        analysis: `@${username} has used ${response.data.length} different username(s) over time.`
    };

    // Process data entries and add transformed entries to changes array
    if (response.data && response.data.length > 0) {
        // Sort by date (most recent first)
        const sortedData = [...response.data].sort((a, b) => 
            new Date(b.last_checked) - new Date(a.last_checked)
        );

        // Find the most recent and current usernames
        const mostRecentUsername = sortedData[0].username;

        // Calculate duration between username changes
        for (let i = 0; i < sortedData.length; i++) {
            const current = sortedData[i];
            const next = sortedData[i + 1];
            
            const currentDate = new Date(current.last_checked);
            const formattedDate = currentDate.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });

            let duration, riskLevel, notes;
            
            if (i === 0) {
                // This is the most recent (current) username
                duration = "Current";
                riskLevel = "low";
                notes = "Current username";
            } else {
                const prevDate = new Date(sortedData[i-1].last_checked);
                const diffInDays = Math.floor((prevDate - currentDate) / (1000 * 60 * 60 * 24));
                
                duration = `${diffInDays} days`;
                
                // Assign risk level based on frequency of changes
                if (diffInDays < 7) {
                    riskLevel = "high";
                    notes = "Frequent username changes can indicate suspicious activity";
                } else if (diffInDays < 30) {
                    riskLevel = "medium";
                    notes = "Moderate change frequency";
                } else {
                    riskLevel = "low";
                    notes = "Normal username change pattern";
                }
            }

            usernameHistory.changes.push({
                username: current.username,
                date: formattedDate,
                duration: duration,
                notes: notes,
                riskLevel: riskLevel
            });
        }
    }

    return usernameHistory;
}

/**
 * Get tweets with contract addresses for a user
 * @param {string} username - Twitter username
 * @param {number} page - Pagination page number
 * @returns {Promise<object>} - Tweets with contract addresses
 */
async function getContractTweets(username, page = 1) {
    const response = await apiRequest('/api/metadata/get_deleted_tweets', {
        user: username,
        how: 'username',
        page
    });

    console.log("Raw tweet data:", response.data);

    // Transform API response to expected format for renderCADetection
    const contractData = {
        contracts: [],
        deletedContracts: []
    };

    // Process contract data if available
    if (response.data && Array.isArray(response.data)) {
        response.data.forEach(tweet => {
            console.log("Processing tweet:", tweet.full_text || tweet.text);
            
            const tweetText = tweet.full_text || tweet.text;
            if (!tweetText) {
                console.log("Tweet has no text content");
                return;
            }

            // Check if tweet is deleted - based on views_count being null or delete flag
            const isDeleted = tweet.views_count === null || tweet.deleted === true;
            console.log(`Tweet ${tweet.tweet_id || tweet.id} deleted status:`, isDeleted);

            // Extract contract addresses using multiple regex patterns
            // Ethereum address pattern: 0x followed by 40 hex characters
            const ethAddressRegex = /0x[a-fA-F0-9]{40}/g;
            
            // Solana address pattern: Base58 strings (alphanumeric except 0, O, I, l)
            // Standard characters allowed in base58: 123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz
            const solanaAddressRegex = /[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{32,44}/g;
            
            // Find addresses with "CA:" prefix (common format in tweets)
            const labeledAddressRegex = /CA:\s*([123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{32,44})/g;
            
            // Find all matches in the tweet text
            const ethAddresses = tweetText.match(ethAddressRegex) || [];
            console.log("ETH addresses found:", ethAddresses);
            
            const solanaAddresses = tweetText.match(solanaAddressRegex) || [];
            console.log("Solana addresses found:", solanaAddresses);
            
            // For labeled addresses, extract the address part
            const labeledMatches = Array.from(tweetText.matchAll(labeledAddressRegex));
            const labeledAddresses = labeledMatches.map(match => match[1]);
            console.log("Labeled addresses found:", labeledAddresses);
            
            // Special handling for the exact "CA: X" pattern
            if (tweetText.includes("CA:") && labeledAddresses.length === 0) {
                // Try a more lenient regex for CA-prefixed addresses
                const lenientCARegex = /CA:\s*(\S+)/g;
                const lenientMatches = Array.from(tweetText.matchAll(lenientCARegex));
                const lenientAddresses = lenientMatches.map(match => match[1]);
                console.log("Lenient CA addresses found:", lenientAddresses);
                
                // Add these to labeled addresses if they look like valid crypto addresses (at least 20 chars)
                lenientAddresses.forEach(addr => {
                    if (addr.length >= 20 && !labeledAddresses.includes(addr)) {
                        labeledAddresses.push(addr);
                    }
                });
            }
            
            // Combine all unique addresses
            const allAddresses = [...new Set([...ethAddresses, ...solanaAddresses, ...labeledAddresses])];
            console.log("All unique addresses:", allAddresses);
            
            allAddresses.forEach(address => {
                // Determine blockchain type
                let blockchain = "Ethereum";
                if (!address.startsWith("0x")) {
                    blockchain = "Solana";
                }
                
                // Determine risk level, taking deletion status into account
                let riskLevel = determineTweetRiskLevel(tweet);
                
                // Increase risk level for deleted tweets
                if (isDeleted && riskLevel === "low") {
                    riskLevel = "medium";
                }
                
                const contract = {
                    address: address,
                    date: new Date(tweet.created_at || tweet.tweet_time || Date.now()).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                    }),
                    riskLevel: riskLevel,
                    etherscanLink: blockchain === "Ethereum" 
                        ? `https://etherscan.io/address/${address}`
                        : `https://solscan.io/account/${address}`,
                    tweetLink: tweet.id || tweet.tweet_id 
                        ? `https://twitter.com/${username}/status/${tweet.id || tweet.tweet_id}` 
                        : '#',
                    blockchain: blockchain,
                    message: tweetText, // Add the full tweet text
                    deleted: isDeleted // Mark if tweet is deleted
                };
                
                // Add to appropriate array
                if (isDeleted) {
                    contractData.deletedContracts.push(contract);
                }
                
                contractData.contracts.push(contract);
            });
        });
    }

    console.log("Processed contract data:", contractData);
    return contractData;
}

/**
 * Helper function to determine risk level of a tweet
 * @param {object} tweet - Tweet data
 * @returns {string} - Risk level (low, medium, high)
const listComponent = () => {
      return renderHandle
    return loadResponse
    return handleStatic
};

 */
function determineTweetRiskLevel(tweet) {
    // Default to low risk
    let risk = "low";
    
    // Check if tweet is deleted - either explicit flag or views_count is null
    const isDeleted = tweet.deleted === true || tweet.views_count === null;
    
    // Deleted tweets have at least medium risk
    if (isDeleted) {
        risk = "medium";
    }
    
    // Look for suspicious phrases
    const suspiciousPhrases = [
        "airdrop", "free", "giveaway", "claim", "mint now", "presale", 
        "whitelist", "early access", "exclusive", "limited", "hurry"
    ];
    
    if (tweet.text || tweet.full_text) {
        const lowerText = (tweet.text || tweet.full_text).toLowerCase();
        const hasSuspiciousPhrases = suspiciousPhrases.some(phrase => 
            lowerText.includes(phrase.toLowerCase())
        );
        
        if (hasSuspiciousPhrases) {
            risk = isDeleted ? "high" : "medium";
        }
    }
    
    return risk;
}

/**
 * Get scored/key followers for a user
 * @param {string} username - Twitter username
 * @param {number} page - Pagination page number
 * @returns {Promise<object>} - Scored followers data
 */
async function getScoredFollowers(username, page = 1) {
    const response = await apiRequest('/api/graph/get_scored_followers', {
        user: username,
        how: 'username',
        page
    });

    // Transform API response to expected format for renderKeyFollowers
    const keyFollowersData = {
        followers: [],
        whyMatter: "Key followers are accounts with high follower counts and influence scores."
    };

    // Process followers data if available
    if (response.data && Array.isArray(response.data)) {
        // Sort by follower score (descending)
        const sortedData = [...response.data].sort((a, b) => 
            b.follower_score - a.follower_score
        );
        
        // Process each follower and add to the result array
        sortedData.forEach(follower => {
            // Simple risk level based on score
            let riskLevel = "medium";
            if (follower.follower_score > 300) {
                riskLevel = "high";
            } else if (follower.follower_score < 150) {
                riskLevel = "low";
            }
            
            // Format the follower data
            keyFollowersData.followers.push({
                username: follower.follower_username,
                followers: new Intl.NumberFormat().format(follower.follower_num_followers),
                description: `Influence score: ${Math.round(follower.follower_score)}`,
                date: "N/A", // API doesn't provide the follow date
                riskLevel: riskLevel
            });
        });
    }

    return keyFollowersData;
}

// Export all API functions
const ToriiAPI = {
    getFirstFollowers,
    getBioHistory,
    getPastUsernames,
    getContractTweets,
    getScoredFollowers
}; 
// TODO: Implement userFetch
