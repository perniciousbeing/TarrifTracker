// Tariff rate updater script - fetches the latest tariff rates from Trade Compliance Resource Hub

/**
 * Fetches and extracts tariff rate information from Trade Compliance Resource Hub
 * @param {string} url - The URL to fetch tariff data from
 * @returns {Promise<Object>} - Promise resolving to extracted tariff rates
 */
async function fetchTariffRates(url = 'https://www.tradecomplianceresourcehub.com/2025/04/29/trump-2-0-tariff-tracker/') {
  try {
    // This function will be executed on the server side using the web scraper
    // The actual implementation will use server-side communication
    console.log(`[Tariff Calculator] Fetching tariff rates from ${url}...`);
    
    // In a real Chrome extension, we would make a fetch request to a backend API
    // that would scrape the website and return the tariff rates
    // For this simulation, we'll rely on the background script to handle the communication
    
    // Message the background script to start the tariff update process
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ 
        action: 'updateTariffRates',
        url: url
      }, response => {
        if (response && response.success) {
          resolve(response.rates);
        } else {
          reject(new Error(response ? response.error : 'Failed to update tariff rates'));
        }
      });
    });
  } catch (error) {
    console.error('[Tariff Calculator] Error fetching tariff rates:', error);
    throw error;
  }
}

/**
 * Updates the stored tariff configuration with new rates
 * @param {Object} rates - New tariff rates to store
 * @returns {Promise<boolean>} - Promise resolving to success status
 */
async function updateStoredTariffRates(rates) {
  try {
    return new Promise((resolve) => {
      chrome.storage.sync.get('tariffConfig', (result) => {
        if (result.tariffConfig) {
          // Create a copy of the existing config
          const updatedConfig = { ...result.tariffConfig };
          
          // Update with new rates
          if (rates.currencyRates) {
            updatedConfig.currencyRates = {
              ...updatedConfig.currencyRates,
              ...rates.currencyRates
            };
          }
          
          if (rates.defaultRate !== undefined) {
            updatedConfig.defaultRate = rates.defaultRate;
          }
          
          // Add a last updated timestamp
          updatedConfig.lastUpdated = new Date().toISOString();
          
          // Save the updated config
          chrome.storage.sync.set({ tariffConfig: updatedConfig }, () => {
            console.log('[Tariff Calculator] Tariff rates updated successfully');
            
            // Notify any content scripts about the config change
            chrome.runtime.sendMessage({ action: 'configUpdated' });
            
            resolve(true);
          });
        } else {
          console.error('[Tariff Calculator] No existing config found to update');
          resolve(false);
        }
      });
    });
  } catch (error) {
    console.error('[Tariff Calculator] Error updating stored tariff rates:', error);
    return false;
  }
}

// Export functions for use in popup and background scripts
if (typeof module !== 'undefined') {
  module.exports = {
    fetchTariffRates,
    updateStoredTariffRates
  };
}