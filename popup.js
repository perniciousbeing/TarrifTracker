// Popup script for tariff calculator extension

// Default configuration
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
  autoUpdate: false
};

// DOM elements
const activeToggle = document.getElementById('activeToggle');
const defaultRateInput = document.getElementById('defaultRate');
const displayStyleRadios = document.querySelectorAll('input[name="displayStyle"]');
const currencyRateInputs = document.querySelectorAll('.currency-rate');
const saveButton = document.getElementById('saveButton');
const resetButton = document.getElementById('resetButton');
const statusElement = document.getElementById('status');
const lastUpdatedElement = document.getElementById('lastUpdated');
const updateNowButton = document.getElementById('updateNowButton');
const autoUpdateToggle = document.getElementById('autoUpdateToggle');

// Load the current configuration
function loadConfig() {
  chrome.storage.sync.get('tariffConfig', (result) => {
    const config = result.tariffConfig || defaultConfig;
    
    // Set toggle state
    activeToggle.checked = config.isActive;
    
    // Set default rate
    defaultRateInput.value = config.defaultRate;
    
    // Set display style
    for (const radio of displayStyleRadios) {
      radio.checked = (radio.value === config.displayStyle);
    }
    
    // Set currency-specific rates
    currencyRateInputs.forEach(input => {
      const currency = input.dataset.currency;
      if (config.currencyRates && config.currencyRates[currency] !== undefined) {
        input.value = config.currencyRates[currency];
      } else {
        input.value = config.defaultRate;
      }
    });
    
    // Set last updated date
    if (config.lastUpdated) {
      // Format the date for display
      const date = new Date(config.lastUpdated);
      const options = { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      };
      lastUpdatedElement.textContent = date.toLocaleDateString(undefined, options);
    } else {
      lastUpdatedElement.textContent = 'Never';
    }
    
    // Set auto-update toggle
    autoUpdateToggle.checked = config.autoUpdate === true;
  });
}

// Save the configuration
function saveConfig() {
  // Add loading animation
  saveButton.disabled = true;
  saveButton.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Saving...';
  
  // Get display style
  let displayStyle = 'inline';
  for (const radio of displayStyleRadios) {
    if (radio.checked) {
      displayStyle = radio.value;
      break;
    }
  }
  
  // Get currency rates
  const currencyRates = {};
  currencyRateInputs.forEach(input => {
    const currency = input.dataset.currency;
    const rate = parseFloat(input.value);
    if (!isNaN(rate)) {
      currencyRates[currency] = rate;
    }
  });
  
  // Get current config to preserve properties we're not changing
  chrome.storage.sync.get('tariffConfig', (result) => {
    const currentConfig = result.tariffConfig || defaultConfig;
    
    // Create the config object
    const config = {
      ...currentConfig,
      isActive: activeToggle.checked,
      defaultRate: parseFloat(defaultRateInput.value) || defaultConfig.defaultRate,
      currencyRates: currencyRates,
      displayStyle: displayStyle,
      autoUpdate: autoUpdateToggle.checked
    };
    
    // Save to Chrome storage
    chrome.storage.sync.set({ tariffConfig: config }, () => {
      // Restore button
      saveButton.disabled = false;
      saveButton.innerHTML = '<i class="fas fa-save"></i> Save Settings';
      
      // Show success message with animation
      showStatus('Settings saved!', 'success');
      
      // Notify the background script
      chrome.runtime.sendMessage({ 
        action: 'toggleActive',
        value: config.isActive
      });
      
      // Notify about auto-update change
      chrome.runtime.sendMessage({ 
        action: 'toggleAutoUpdate',
        enabled: config.autoUpdate
      });
      
      // Notify any content scripts in the active tab
      chrome.runtime.sendMessage({ action: 'configUpdated' });
    });
  });
}

// Reset configuration to defaults
function resetConfig() {
  // Add loading animation
  resetButton.disabled = true;
  resetButton.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Resetting...';
  
  chrome.storage.sync.set({ tariffConfig: defaultConfig }, () => {
    // Restore button
    resetButton.disabled = false;
    resetButton.innerHTML = '<i class="fas fa-redo"></i> Reset to Defaults';
    
    // Reload the form with default values
    loadConfig();
    
    // Show success message with animation
    showStatus('Settings reset to defaults', 'success');
    
    // Notify the background script
    chrome.runtime.sendMessage({ 
      action: 'toggleActive',
      value: defaultConfig.isActive
    });
    
    // Notify about auto-update change
    chrome.runtime.sendMessage({ 
      action: 'toggleAutoUpdate',
      enabled: defaultConfig.autoUpdate
    });
    
    // Notify any content scripts in the active tab
    chrome.runtime.sendMessage({ action: 'configUpdated' });
  });
}

// Update tariff rates from the web
function updateTariffRates() {
  // Add loading class to button for spinner animation
  updateNowButton.classList.add('loading');
  updateNowButton.disabled = true;
  
  showStatus('Fetching latest tariff rates...', 'info');
  
  // Call the function in tariff_updater.js
  fetchTariffRates()
    .then((rates) => {
      return updateStoredTariffRates(rates);
    })
    .then(() => {
      showStatus('Tariff rates updated successfully!', 'success');
      loadConfig(); // Reload the form with new values
    })
    .catch((error) => {
      console.error('Error updating tariff rates:', error);
      showStatus('Error updating tariff rates: ' + error.message, 'error');
    })
    .finally(() => {
      // Remove loading class and re-enable button
      updateNowButton.classList.remove('loading');
      updateNowButton.disabled = false;
    });
}

// Show a status message with animation
function showStatus(message, type) {
  // Set content and show the message
  statusElement.textContent = message;
  statusElement.className = 'status-message ' + type;
  
  // Clear the message after 3 seconds with animation
  setTimeout(() => {
    // Fade out
    statusElement.style.opacity = '0';
    statusElement.style.transform = 'translateY(-10px)';
    
    // After animation completes, reset
    setTimeout(() => {
      statusElement.textContent = '';
      statusElement.className = 'status-message';
      statusElement.style.opacity = '';
      statusElement.style.transform = '';
    }, 300);
  }, 3000);
}

// Add event listeners
document.addEventListener('DOMContentLoaded', loadConfig);
saveButton.addEventListener('click', saveConfig);
resetButton.addEventListener('click', resetConfig);
updateNowButton.addEventListener('click', updateTariffRates);

// Add event listener for the toggle switches
activeToggle.addEventListener('change', () => {
  // Update background script immediately when toggle is changed
  chrome.runtime.sendMessage({ 
    action: 'toggleActive',
    value: activeToggle.checked
  });
});

autoUpdateToggle.addEventListener('change', () => {
  // Update background script immediately when auto-update toggle is changed
  chrome.runtime.sendMessage({ 
    action: 'toggleAutoUpdate',
    enabled: autoUpdateToggle.checked
  });
  
  if (autoUpdateToggle.checked) {
    showStatus('Daily auto-updates enabled', 'success');
  } else {
    showStatus('Auto-updates disabled', 'info');
  }
});

// Validate numeric inputs
function validateNumericInput(input) {
  const value = parseFloat(input.value);
  if (isNaN(value)) {
    input.value = 0;
  } else {
    const min = parseFloat(input.min);
    const max = parseFloat(input.max);
    
    if (value < min) input.value = min;
    if (value > max) input.value = max;
  }
}

// Add validation to all numeric inputs
defaultRateInput.addEventListener('blur', () => {
  validateNumericInput(defaultRateInput);
});

currencyRateInputs.forEach(input => {
  input.addEventListener('blur', () => {
    validateNumericInput(input);
  });
});
