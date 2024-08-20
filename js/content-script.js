// Create a Set to keep track of seen tweet URLs  
const seenTweetUrls = new Set();  

function extractTweetData() {  
    const tweetElements = document.querySelectorAll('[data-testid="tweet"]');  

    tweetElements.forEach(tweetElement => {  
        const tweetTextElement = tweetElement.querySelector('[data-testid="tweetText"]');  
        if (!tweetTextElement) return;  

        let tweetContentArray = [];  
        tweetTextElement.childNodes.forEach(node => {  
            if (node.nodeType === Node.TEXT_NODE || (node.nodeType === Node.ELEMENT_NODE && (node.tagName === 'SPAN' || node.tagName === 'A'))) {  
                tweetContentArray.push(node.textContent);  
            }  
        });  

        let tweetText = tweetContentArray.join('').trim();
        const tweetLinkElement = tweetElement.querySelector('a[dir="ltr"]');  

        if (tweetLinkElement) {  
            const href = tweetLinkElement.getAttribute('href');  
            const regex = /^\/([^\/]+)(\/status\/\d+)$/;  
            const match = href.match(regex);  

            if (match) {  
                const userId = match[1];  
                const tweetPath = match[2];  
                const fullTweetUrl = `https://x.com/${userId}${tweetPath}`;  

                // Check if this tweet URL has already been processed  
                if (!seenTweetUrls.has(fullTweetUrl)) {  

                    // Extract username (nickname)  
                    let username = null;  
                    try {  
                        const userNameElement = tweetElement.querySelector('[data-testid="User-Name"]');  
                        if (userNameElement) {  
                            const nameElement = userNameElement.querySelector('div[dir="ltr"] > span > span');  
                            if (nameElement) {  
                                username = nameElement.textContent.trim();  
                            }  
                        }  
                    } catch (error) {  
                        console.error('Error extracting username:', error);  
                    }  

                    // Extract time  
                    let tweetTime = null;  
                    try {  
                        const timeElement = tweetElement.querySelector('time');  
                        if (timeElement) {  
                            tweetTime = timeElement.getAttribute('datetime');  
                        }  
                    } catch (error) {  
                        console.error('Error extracting tweet time:', error);  
                    }  

                    // Extract avatar URL  
                    let avatarUrl = null;  
                    try {  
                        const imgElement = tweetElement.querySelector('[data-testid="Tweet-User-Avatar"] img');  
                        if (imgElement) {  
                            avatarUrl = imgElement.src;  
                        }  
                    } catch (error) {  
                        console.error('Error extracting avatar URL:', error);  
                    }  

                    const tweetData = {  
                        id: `${userId}_${tweetPath}`,  
                        time: tweetTime,  
                        username: username,  
                        url: fullTweetUrl,  
                        text: tweetText,  
                        avatarUrl: avatarUrl,  
                        userId: userId  
                    };  

                    // Add the URL to the Set  
                    seenTweetUrls.add(fullTweetUrl);  

                    // Send message to background service worker  
                    // console.log('Sending message to background script:', tweetData);  
                    chrome.runtime.sendMessage({ type: 'storeTweetData', tweetData: tweetData });  
                }  
            }  
        }  
    });  
}  

window.addEventListener('scroll', () => {  
    if (!this.scrollTimer) {  
        this.scrollTimer = setTimeout(() => {  
            this.scrollTimer = null;  
            extractTweetData();  
        }, 300);  
    }  
});  

// Call to capture tweets already visible on the page  
extractTweetData();