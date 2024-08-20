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
    // Convert ISO format time to a more readable format  
    const tweetTime = new Date(result.time).toLocaleString();  

    // Create main container  
    const resultItem = document.createElement('div');  
    resultItem.className = 'result-item';  

    // User info  
    const userInfo = document.createElement('div');  
    userInfo.className = 'user-info';  

    const avatar = document.createElement('img');  
    avatar.src = result.avatarUrl;  
    avatar.alt = 'User Avatar';  
    avatar.className = 'user-avatar';  

    const userNameId = document.createElement('div');  
    userNameId.className = 'user-name-id';  

    const userName = document.createElement('span');  
    userName.className = 'user-name';  
    userName.textContent = result.username;  

    const userId = document.createElement('span');  
    userId.className = 'user-id';  
    userId.textContent = `@${result.userId}`;  

    userNameId.appendChild(userName);  
    userNameId.appendChild(userId);  
    userInfo.appendChild(avatar);  
    userInfo.appendChild(userNameId);  

    // Tweet time  
    const tweetTimeElement = document.createElement('div');  
    tweetTimeElement.className = 'tweet-time';  
    tweetTimeElement.textContent = tweetTime;  

    // Tweet content  
    const tweetContent = document.createElement('p');  
    tweetContent.className = 'tweet-content';  

    const tweetLink = document.createElement('a');  
    tweetLink.href = result.url.startsWith('http') ? result.url : `http://${result.url}`;  
    tweetLink.target = '_blank';  
    tweetLink.className = 'tweet-link';  
    tweetLink.title = 'View Tweet';  
    tweetLink.style.textDecoration = 'none';  
    tweetLink.style.fontSize = '1.2em';  
    tweetLink.style.color = '#1DA1F2';  
    tweetLink.textContent = '🔗 ';  

    tweetContent.appendChild(tweetLink);  

    const textLines = result.text.split('\n');  
    textLines.forEach((line, index) => {  
        tweetContent.appendChild(document.createTextNode(line));  
        if (index < textLines.length - 1) {  
            tweetContent.appendChild(document.createElement('br'));  
        }  
    });  

    // Assemble all elements  
    resultItem.appendChild(userInfo);  
    resultItem.appendChild(tweetTimeElement);  
    resultItem.appendChild(tweetContent);  

    return resultItem;  
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
        searchResults.forEach(result => {  
            const resultElement = createResultItemHTML(result);  
            searchResultsContainer.appendChild(resultElement);  
        });  
    }  
}  

// Function: Search tweets  
function searchTweets(query) {  
    getAllTweets()  
        .then(tweets => {  
            const filteredTweets = tweets.filter(tweet => {  
                try {  
                    const lowercaseQuery = query.toLowerCase();  
                    return (  
                        (tweet.text && tweet.text.toLowerCase().includes(lowercaseQuery)) ||  
                        (tweet.username && tweet.username.toLowerCase().includes(lowercaseQuery)) ||  
                        (tweet.userId && tweet.userId.toLowerCase().includes(lowercaseQuery))  
                    );  
                } catch (error) {  
                    console.warn('Error processing tweet:', error, tweet);  
                    return false; // Skip this tweet if there's an error  
                }  
            });  
            const sortedTweets = filteredTweets.sort((a, b) => new Date(b.time) - new Date(a.time));  
            renderSearchResults(sortedTweets);  
        })  
        .catch(error => {  
            console.error('Failed to search tweets:', error);  
            // You can add error handling here, such as displaying an error message to the user  
        });  
}  

// Function: Initialize search functionality  
function initializeSearch() {  
    const searchInput = document.querySelector('.search-box');  
    searchInput.addEventListener('input', debounce(function(e) {  
        const query = e.target.value.trim();  
        if (query.length > 0) {  
            searchTweets(query);  
        } else {  
            fetchAndRenderResults(); // If search box is empty, show all results  
        }  
    }, 300)); // 300ms debounce delay  
}  

// Function: Fetch data from IndexedDB, sort by time in descending order, and render search results  
function fetchAndRenderResults() {  
    getAllTweets()  
        .then(tweets => {  
            const sortedTweets = tweets.sort((a, b) => new Date(b.time) - new Date(a.time));  
            renderSearchResults(sortedTweets);  
        })  
        .catch(error => {  
            console.error('Failed to fetch tweets:', error);  
            // You can add error handling here, such as displaying an error message to the user  
        });  
}

// Debounce function  
function debounce(func, delay) {  
    let debounceTimer;  
    return function() {  
        const context = this;  
        const args = arguments;  
        clearTimeout(debounceTimer);  
        debounceTimer = setTimeout(() => func.apply(context, args), delay);  
    }  
}  

// Initialize after page load  
document.addEventListener('DOMContentLoaded', () => {  
    fetchAndRenderResults();  
    initializeSearch();  
});