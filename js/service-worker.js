// Copyright 2023 Google LLC  
//  
// Licensed under the Apache License, Version 2.0 (the "License");  
// you may not use this file except in compliance with the License.  
// You may obtain a copy of the License at  
//  
//     https://www.apache.org/licenses/LICENSE-2.0  
//  
// Unless required by applicable law or agreed to in writing, software  
// distributed under the License is distributed on an "AS IS" BASIS,  
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.  
// See the License for the specific language governing permissions and  
// limitations under the License.  

chrome.runtime.onInstalled.addListener(() => {  
    chrome.contextMenus.create({  
      id: 'openSidePanel',  
      title: 'Tweet Trace',  
      contexts: ['all']  
    });  
    chrome.tabs.create({ url: 'html/about.html' });  
  });  
  
  chrome.contextMenus.onClicked.addListener((info, tab) => {  
    if (info.menuItemId === 'openSidePanel') {  
      // This will open the panel in all the pages on the current window.  
      chrome.sidePanel.open({ windowId: tab.windowId });  
    }  
  });  
  
  let dbPromise;  
  
  function openIndexedDB() {  
      if (!dbPromise) {  
          dbPromise = new Promise((resolve, reject) => {  
              const request = indexedDB.open('TweetTraceDB', 1);  
  
              request.onupgradeneeded = event => {  
                  const db = event.target.result;  
                  if (!db.objectStoreNames.contains('tweets')) {  
                      db.createObjectStore('tweets', { keyPath: 'id' });  
                  }  
              };  
  
              request.onsuccess = event => {  
                  resolve(event.target.result);  
              };  
  
              request.onerror = event => {  
                  reject('IndexedDB error: ' + event.target.errorCode);  
              };  
          });  
      }  
      return dbPromise;  
  }  
  
  function storeTweetData(tweetData) {  
      openIndexedDB().then(db => {  
          const transaction = db.transaction('tweets', 'readwrite');  
          const store = transaction.objectStore('tweets');  
  
          // First, get the count of all data  
          store.count().onsuccess = function(event) {  
              const count = event.target.result;  
  
              // If the count has reached or exceeded 10000  
              if (count >= 10000) {  
                  // Get all keys  
                  store.getAllKeys().onsuccess = function(event) {  
                      const keys = event.target.result;  
                      // Delete the oldest data (assuming keys are sorted by insertion order)  
                      store.delete(keys[0]).onsuccess = function() {  
                          // After successful deletion, add new data  
                          store.add(tweetData);  
                      };  
                  };  
              } else {  
                  // If the count is less than 10000, directly add new data  
                  store.add(tweetData);  
              }  
          };  
  
      }).catch(error => {  
          console.error('Failed to open IndexedDB:', error);  
      });  
  }  
  
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {  
    // console.log('Received message:', message);  
    if (message.type === 'storeTweetData') {  
        storeTweetData(message.tweetData);  
    }  
  });