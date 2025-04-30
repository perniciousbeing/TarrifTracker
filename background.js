// Keep track of the extension state
let isActive = false;

// Initialize default tariff rates when the extension is installed
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get('tariffConfig', (result) => {
    if (!result.tariffConfig) {
      // Set default configuration if none exists
      const defaultConfig = {
        isActive: true,
        defaultRate: 25, // Default tariff rate percentage
        currencyRates: {
          'USD': 25,
          'EUR': 20,
          'GBP': 22,
          'CAD': 18,
          'AUD': 19,
          'JPY': 15
        },
        displayStyle: 'inline', // or 'tooltip'
        lastUpdated: new Date().toISOString(),
        autoUpdate: false // Whether to automatically update tariff rates
      };
      
      chrome.storage.sync.set({ tariffConfig: defaultConfig }, () => {
        console.log('Default tariff configuration set');
        isActive = defaultConfig.isActive;
        updateBadge();
      });
    } else {
      isActive = result.tariffConfig.isActive;
      updateBadge();
      
      // Check if auto-update is enabled
      if (result.tariffConfig.autoUpdate) {
        // Schedule a daily check for updates
        scheduleAutoUpdate();
      }
    }
  });
});

// Schedule automatic updates if enabled
function scheduleAutoUpdate() {
  // Check if we already have an alarm
  chrome.alarms.get('tariffUpdateCheck', (alarm) => {
    if (!alarm) {
      // Set an alarm to check for updates daily
      chrome.alarms.create('tariffUpdateCheck', {
        delayInMinutes: 60, // First check after 1 hour
        periodInMinutes: 24 * 60 // Then daily
      });
    }
  });
}

// Listen for the alarm
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'tariffUpdateCheck') {
    chrome.storage.sync.get('tariffConfig', (result) => {
      if (result.tariffConfig && result.tariffConfig.autoUpdate) {
        updateTariffRatesFromWeb();
      }
    });
  }
});

// Function to update tariff rates from the web
async function updateTariffRatesFromWeb(sendResponse) {
  try {
    console.log('[Tariff Calculator] Updating tariff rates from the web...');
    
    // Make a request to our server endpoint to get the latest rates
    // In a real deployment, this would be a request to a secure endpoint
    const fetchUrl = 'http://localhost:5000/tariff_data';
    
    // Create a background fetch request
    fetch(fetchUrl)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        console.log('[Tariff Calculator] Received updated tariff data:', data);
        
        // Update storage with new rates
        chrome.storage.sync.get('tariffConfig', (result) => {
          if (result.tariffConfig) {
            // Create a copy of the existing config
            const updatedConfig = { ...result.tariffConfig };
            
            // Update with new rates
            if (data.currencyRates) {
              updatedConfig.currencyRates = {
                ...updatedConfig.currencyRates,
                ...data.currencyRates
              };
            }
            
            if (data.defaultRate !== undefined) {
              updatedConfig.defaultRate = data.defaultRate;
            }
            
            // Update the last updated timestamp
            updatedConfig.lastUpdated = new Date().toISOString();
            
            // Save the updated config
            chrome.storage.sync.set({ tariffConfig: updatedConfig }, () => {
              console.log('[Tariff Calculator] Tariff rates updated successfully');
              
              // Notify any open tabs about the config change
              chrome.tabs.query({}, (tabs) => {
                tabs.forEach(tab => {
                  chrome.tabs.sendMessage(tab.id, { action: 'configUpdated' });
                });
              });
              
              // Send response if this was triggered manually
              if (sendResponse) {
                sendResponse({ 
                  success: true, 
                  rates: data,
                  message: 'Tariff rates updated successfully'
                });
              }
            });
          } else if (sendResponse) {
            sendResponse({ 
              success: false, 
              error: 'No existing configuration found'
            });
          }
        });
      })
      .catch(error => {
        console.error('[Tariff Calculator] Error updating tariff rates:', error);
        if (sendResponse) {
          sendResponse({ 
            success: false, 
            error: error.message || 'Error updating tariff rates'
          });
        }
      });
      
    // If this is being called from onMessage, we need to return true to indicate
    // that we will call sendResponse asynchronously
    return true;
  } catch (error) {
    console.error('[Tariff Calculator] Error in updateTariffRatesFromWeb:', error);
    if (sendResponse) {
      sendResponse({ 
        success: false, 
        error: error.message || 'Unknown error'
      });
    }
    return false;
  }
}

// Function to update the extension badge based on active state
function updateBadge() {
  if (isActive) {
    chrome.action.setBadgeText({ text: 'ON' });
    chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
  } else {
    chrome.action.setBadgeText({ text: 'OFF' });
    chrome.action.setBadgeBackgroundColor({ color: '#F44336' });
  }
}

// Listen for messages from popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getState') {
    sendResponse({ isActive });
  } else if (message.action === 'toggleActive') {
    isActive = message.value;
    
    // Update the configuration in storage
    chrome.storage.sync.get('tariffConfig', (result) => {
      if (result.tariffConfig) {
        result.tariffConfig.isActive = isActive;
        chrome.storage.sync.set({ tariffConfig: result.tariffConfig });
      }
    });
    
    updateBadge();
    
    // Notify any active tabs about the state change
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'stateChanged', isActive });
      }
    });
    
    sendResponse({ success: true });
  } else if (message.action === 'configUpdated') {
    // When config is updated from popup, notify active tabs
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'configUpdated' });
      }
    });
    
    sendResponse({ success: true });
  } else if (message.action === 'updateTariffRates') {
    // Trigger a manual update of tariff rates
    return updateTariffRatesFromWeb(sendResponse);
  } else if (message.action === 'toggleAutoUpdate') {
    // Toggle the auto-update setting
    chrome.storage.sync.get('tariffConfig', (result) => {
      if (result.tariffConfig) {
        result.tariffConfig.autoUpdate = message.enabled;
        chrome.storage.sync.set({ tariffConfig: result.tariffConfig }, () => {
          if (message.enabled) {
            scheduleAutoUpdate();
          } else {
            chrome.alarms.clear('tariffUpdateCheck');
          }
          
          sendResponse({ success: true });
        });
      } else {
        sendResponse({ success: false, error: 'No configuration found' });
      }
    });
    
    return true; // Indicate we'll respond asynchronously
  }
  
  return true; // Required for async response
});
