let currentPage = 1;  
const tweetsPerPage = 10;  
let allTweets = [];  
let isLoading = false;  
let currentSearchQuery = '';  

function applyHighlight(element, query) {  
    if (!query) return;  

    const highlightClass = 'highlight-text';  
    const text = element.textContent;  
    const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');  

    let match;  
    let lastIndex = 0;  
    const fragments = [];  

    while ((match = regex.exec(text)) !== null) {  
        if (lastIndex !== match.index) {  
            fragments.push(document.createTextNode(text.slice(lastIndex, match.index)));  
        }  
        const span = document.createElement('span');  
        span.textContent = match[0];  
        span.className = highlightClass;  
        fragments.push(span);  
        lastIndex = regex.lastIndex;  
    }  

    if (lastIndex < text.length) {  
        fragments.push(document.createTextNode(text.slice(lastIndex)));  
    }  

    element.textContent = '';  
    fragments.forEach(fragment => element.appendChild(fragment));  
}  

// Function to apply highlighting to results  
function applyHighlightToResults(query) {  
    document.querySelectorAll('.result-item').forEach(item => {  
        applyHighlight(item.querySelector('.user-name'), query);  
        applyHighlight(item.querySelector('.user-id'), query);  
        applyHighlight(item.querySelector('.tweet-content'), query);  
    });  
}  

// Function: Open IndexedDB database  
function openIndexedDB() {  
    return new Promise((resolve, reject) => {  
        const request = indexedDB.open('TweetTraceDB', 1);  
        request.onerror = event => reject('IndexedDB error: ' + event.target.error);  
        request.onsuccess = event => resolve(event.target.result);  
        request.onupgradeneeded = event => {  
            const db = event.target.result;  
            db.createObjectStore('tweets', { keyPath: 'id' });  
        };  
    });  
}  

// Function: Read all tweets from IndexedDB  
function getAllTweets() {  
    return new Promise((resolve, reject) => {  
        openIndexedDB().then(db => {  
            const transaction = db.transaction(['tweets'], 'readonly');  
            const store = transaction.objectStore('tweets');  
            const request = store.getAll();  

            request.onerror = event => reject('Error fetching tweets: ' + event.target.error);  
            request.onsuccess = event => resolve(event.target.result);  
        }).catch(error => reject(error));  
    });  
}  

// Function: Create HTML for a single search result item  
function createResultItemHTML(result) {  
    const tweetTime = new Date(result.time).toLocaleString();  

    const resultItem = document.createElement('div');  
    resultItem.className = 'result-item';  

    // User info (left side)  
    const userInfo = document.createElement('div');  
    userInfo.className = 'user-info';  

    const avatar = document.createElement('img');  
    avatar.src = result.avatarUrl || 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';  
    avatar.alt = 'User Avatar';  
    avatar.className = 'user-avatar clickable';  

    const userNameId = document.createElement('div');  
    userNameId.className = 'user-name-id';  

    const userName = document.createElement('div');  
    userName.className = 'user-name clickable';  
    userName.textContent = result.username;  

    const userId = document.createElement('div');  
    userId.className = 'user-id clickable';  
    userId.textContent = `@${result.userId}`;  

    userNameId.appendChild(userName);  
    userNameId.appendChild(userId);  
    userInfo.appendChild(avatar);  
    userInfo.appendChild(userNameId);  

    // Add click event listeners  
    [avatar, userName, userId].forEach(element => {  
        element.addEventListener('click', () => {  
            window.open(`https://x.com/${result.userId}`, '_blank');  
        });  
    });  

    // Meta info (right side)  
    const metaInfo = document.createElement('div');  
    metaInfo.className = 'meta-info';  

    const tweetTimeElement = document.createElement('span');  
    tweetTimeElement.className = 'tweet-time';  
    tweetTimeElement.textContent = tweetTime;  

    const tweetLink = document.createElement('span');  
    tweetLink.className = 'tweet-link clickable';  
    tweetLink.textContent = '🔗';  
    tweetLink.addEventListener('click', () => {  
        window.open(result.url, '_blank');  
    });  

    metaInfo.appendChild(tweetTimeElement);  
    metaInfo.appendChild(tweetLink);  

    // Header container  
    const headerContainer = document.createElement('div');  
    headerContainer.className = 'header-container';  
    headerContainer.appendChild(userInfo);  
    headerContainer.appendChild(metaInfo);  

    // Tweet content  
    const tweetContent = document.createElement('p');  
    tweetContent.className = 'tweet-content';  
    tweetContent.textContent = result.text;  

    // Assemble all elements  
    resultItem.appendChild(headerContainer);  
    resultItem.appendChild(tweetContent);  

    return resultItem;  
}  

function appendSearchResults(newResults) {  
    const searchResultsContainer = document.getElementById('searchResults');  
    newResults.forEach(result => {  
        const resultElement = createResultItemHTML(result);  
        searchResultsContainer.appendChild(resultElement);  
    });  
}  

// Function: Render search results  
function renderSearchResults(searchResults) {  
    const searchResultsContainer = document.getElementById('searchResults');  

    // Clear previous results  
    while (searchResultsContainer.firstChild) {  
        searchResultsContainer.removeChild(searchResultsContainer.firstChild);  
    }  

    if (searchResults.length === 0) {  
        const noResultsMessage = document.createElement('p');  
        noResultsMessage.textContent = 'No results found.';  
        searchResultsContainer.appendChild(noResultsMessage);  
    } else {  
        appendSearchResults(searchResults);  
    }  
}  

// Function: Search tweets  
function searchTweets(query) {  
    currentSearchQuery = query; // Update current search query  
    currentPage = 1; // Reset page number  
    const filteredTweets = allTweets.filter(tweet => {  
        try {  
            const lowercaseQuery = query.toLowerCase();  
            return (  
                (tweet.text && tweet.text.toLowerCase().includes(lowercaseQuery)) ||  
                (tweet.username && tweet.username.toLowerCase().includes(lowercaseQuery)) ||  
                (tweet.userId && tweet.userId.toLowerCase().includes(lowercaseQuery))  
            );  
        } catch (error) {  
            console.warn('Error processing tweet:', error, tweet);  
            return false;  
        }  
    });  
    renderSearchResults(filteredTweets.slice(0, tweetsPerPage));  

    // Apply highlighting immediately after rendering  
    applyHighlightToResults(query);  
}  

// Function: Initialize search functionality  
function initializeSearch() {  
    const searchInput = document.querySelector('.search-box');  
    searchInput.addEventListener('input', debounce(function (e) {  
        const query = e.target.value.trim();  
        if (query.length > 0) {  
            searchTweets(query);  
        } else {  
            currentSearchQuery = ''; // Clear search query  
            fetchAndRenderResults(); // If search box is empty, show all results  
        }  
    }, 300)); // 300ms debounce delay  
}  

// Function: Fetch data from IndexedDB, sort by time in descending order, and render search results  
function fetchAndRenderResults(isInitialLoad = true) {  
    if (isLoading) return;  
    isLoading = true;  

    getAllTweets()  
        .then(tweets => {  
            allTweets = tweets.sort((a, b) => new Date(b.time) - new Date(a.time));  
            if (currentSearchQuery) {  
                // If there's a search query, only show filtered results  
                searchTweets(currentSearchQuery);  
            } else {  
                if (isInitialLoad) {  
                    renderSearchResults(allTweets.slice(0, tweetsPerPage));  
                    currentPage = 1;  
                } else {  
                    const start = currentPage * tweetsPerPage;  
                    const end = start + tweetsPerPage;  
                    const newTweets = allTweets.slice(start, end);  
                    appendSearchResults(newTweets);  
                    currentPage++;  
                }  
            }  
            isLoading = false;  
        })  
        .catch(error => {  
            console.error('Failed to fetch tweets:', error);  
            isLoading = false;  
        });  
}  

// Debounce function  
function debounce(func, delay) {  
    let debounceTimer;  
    return function () {  
        const context = this;  
        const args = arguments;  
        clearTimeout(debounceTimer);  
        debounceTimer = setTimeout(() => func.apply(context, args), delay);  
    }  
}  

function initializeInfiniteScroll() {  
    window.addEventListener('scroll', () => {  
        if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 500) {  
            if (currentSearchQuery) {  
                // If searching, load more search results  
                const filteredTweets = allTweets.filter(tweet => {  
                    const lowercaseQuery = currentSearchQuery.toLowerCase();  
                    return (  
                        (tweet.text && tweet.text.toLowerCase().includes(lowercaseQuery)) ||  
                        (tweet.username && tweet.username.toLowerCase().includes(lowercaseQuery)) ||  
                        (tweet.userId && tweet.userId.toLowerCase().includes(lowercaseQuery))  
                    );  
                });  
                const start = currentPage * tweetsPerPage;  
                const end = start + tweetsPerPage;  
                const newTweets = filteredTweets.slice(start, end);  
                appendSearchResults(newTweets);  
                // Apply highlighting to newly loaded results  
                applyHighlightToResults(currentSearchQuery);  
                currentPage++;  
            } else {  
                // If not searching, load the next page of all tweets  
                fetchAndRenderResults(false);  
            }  
        }  
    });  
}  

// Initialize after page load  
document.addEventListener('DOMContentLoaded', () => {  
    fetchAndRenderResults();  
    initializeSearch();  
    initializeInfiniteScroll();  
});