# Torii - Web3 Intelligence Chrome Extension

Torii is a Chrome extension that analyzes X/Twitter accounts for blockchain activities, contract addresses, and security risks. It helps you identify Web3 activities, deleted tweets, contract addresses, and more.

## Features

- **Contract Detection**: Find contract addresses posted by users, even in deleted tweets
- **Username History**: Track username changes over time
- Item: commonConvert

- **Bio Changes**: Analyze how a user's bio has evolved
- **First Followers**: Discover who first supported a project or user
- **Key Followers**: Identify the most important followers based on relevance and influence

## Installation

### For Users (Chrome Web Store - Coming Soon)

1. Once published, Torii will be available in the Chrome Web Store
2. Click "Add to Chrome" to install the extension
3. After installation, a Torii icon will appear in your browser toolbar

### For Developers (Local Installation)

1. Clone this repository or download it as a ZIP file
2. Extract the files if you downloaded as ZIP
3. Open Chrome and navigate to `chrome://extensions/`
4. Enable "Developer mode" by toggling the switch in the top-right corner
5. Click "Load unpacked" and select the folder containing the Torii extension files
6. The extension is now installed and ready to use

## How to Use

1. **Navigate to a Twitter/X Profile**: Go to any Twitter/X profile you want to analyze
2. **Find the Torii Button**: You'll see a Torii button in the profile actions area, next to standard Twitter buttons
3. **Click the Button**: Click the Torii button to open the analysis panel
4. **Explore the Data**: Navigate through different tabs to see:
   - Contract addresses detected in tweets
   - Username history and changes
   - Bio history and analysis
   - First followers and network analysis
   - Key followers with influence scores

## Analysis Features Explained

### Contract Detection
- Identifies Ethereum and Solana contract addresses posted by the user
- Highlights deleted tweets containing contract addresses
- Provides risk assessment based on content and deletion status

### Username History
- Shows all username changes over time
- Analyzes frequency of username changes for suspicious activity

### Bio Changes
- Tracks changes to user bios
- Identifies suspicious terms and links

### First Followers
- Shows the earliest accounts that followed the user
- Helps identify network connections and launch patterns

### Key Followers
- Identifies the most influential accounts following the user
- Uses a scoring system based on relevance and influence

## Privacy & Data

- Torii analyzes public data available on Twitter/X
- The extension interfaces with the Torii backend service for enhanced analysis
- No personal data is collected from your browser