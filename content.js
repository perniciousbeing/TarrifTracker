// Main content script for tariff calculator extension

// Track all inserted overlay elements for later removal
let insertedOverlays = [];
let isExtensionActive = true;
let currentConfig = null;

// Load configuration and check extension state
function initialize() {
  chrome.storage.sync.get('tariffConfig', (result) => {
    if (result.tariffConfig) {
      currentConfig = result.tariffConfig;
      isExtensionActive = currentConfig.isActive;
      
      if (isExtensionActive) {
        processPage();
      }
    }
  });
}

// Process the page to find and annotate prices
function processPage() {
  // Clear any existing overlays
  clearOverlays();
  
  if (!isExtensionActive || !currentConfig) return;
  
  // Find price elements
  const priceElements = detectPrices(document.body);
  
  console.log(`[Tariff Calculator] Found ${priceElements.length} price elements on the page`, priceElements);
  
  // Process each price element
  priceElements.forEach(item => {
    const tariffAmount = calculateTariff(item.price, item.currency, currentConfig);
    
    // Create and add the overlay
    addTariffOverlay(item.element, item.price, tariffAmount, item.currency, item.symbol);
  });
  
  // Set up a mutation observer to detect DOM changes
  setupMutationObserver();
}

// Add a tariff overlay to a price element with animation
function addTariffOverlay(element, originalPrice, tariffAmount, currency, symbol) {
  // Don't add overlays to elements we've already processed
  if (element.dataset.tariffProcessed) return;
  
  // Mark this element as processed
  element.dataset.tariffProcessed = 'true';
  
  // Create the overlay element with animation styles
  const overlay = document.createElement('span');
  overlay.className = 'tariff-overlay';
  overlay.style.marginLeft = '5px';
  overlay.style.color = '#e74c3c';
  overlay.style.fontWeight = 'bold';
  overlay.style.fontSize = '0.9em';
  overlay.style.opacity = '0';
  overlay.style.transform = 'translateY(5px)';
  overlay.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
  
  // Calculate the final price (original + tariff)
  const finalPrice = originalPrice + tariffAmount;
  
  // Format the tariff amount and final price
  const formattedTariff = formatCurrency(tariffAmount, currency, symbol);
  const formattedFinalPrice = formatCurrency(finalPrice, currency, symbol);
  
  // Set content based on display style
  if (currentConfig.displayStyle === 'tooltip') {
    element.style.position = 'relative';
    element.style.borderBottom = '1px dotted #e74c3c';
    element.style.transition = 'border-bottom-color 0.3s ease';
    element.title = `Tariff: ${formattedTariff} | Final price: ${formattedFinalPrice}`;
  } else {
    // Default: inline display
    overlay.innerHTML = `<span style="color: #e74c3c;">+${formattedTariff}</span> tariff | Final: <strong>${formattedFinalPrice}</strong>`;
    
    // For text nodes, we need to insert after the node itself
    if (element.nodeType === Node.TEXT_NODE) {
      const wrapper = document.createElement('span');
      wrapper.style.display = 'inline';
      
      // Clone the text node
      const textClone = element.cloneNode(true);
      
      // Replace the original text node with our wrapper
      element.parentNode.insertBefore(wrapper, element);
      element.parentNode.removeChild(element);
      
      // Add the cloned text and our overlay to the wrapper
      wrapper.appendChild(textClone);
      wrapper.appendChild(overlay);
      
      // Track the wrapper instead
      insertedOverlays.push(wrapper);
    } else {
      // For regular elements, simply append
      element.appendChild(overlay);
      insertedOverlays.push(overlay);
    }
    
    // Trigger animation after a short delay (for DOM to settle)
    setTimeout(() => {
      overlay.style.opacity = '1';
      overlay.style.transform = 'translateY(0)';
    }, 50);
  }
}

// Remove all tariff overlays with animation
function clearOverlays() {
  // Remove any data attributes we've added
  document.querySelectorAll('[data-tariff-processed]').forEach(el => {
    delete el.dataset.tariffProcessed;
    
    // Animate tooltip style removal if applicable
    if (el.style.borderBottom && el.style.borderBottom.includes('dotted')) {
      el.style.borderBottomColor = 'transparent';
      setTimeout(() => {
        el.style.borderBottom = '';
        el.style.transition = '';
      }, 300);
    } else {
      el.style.borderBottom = '';
    }
    
    el.title = '';
  });
  
  // Remove our inserted overlay elements with fade out animation
  const overlaysToRemove = [...insertedOverlays]; // Create a copy
  insertedOverlays = []; // Clear the original array
  
  overlaysToRemove.forEach(overlay => {
    try {
      if (overlay.parentNode) {
        // Fade out animation
        if (overlay.classList.contains('tariff-overlay')) {
          overlay.style.opacity = '0';
          overlay.style.transform = 'translateY(5px)';
          
          // Remove after animation completes
          setTimeout(() => {
            if (overlay.parentNode) {
              overlay.parentNode.removeChild(overlay);
            }
          }, 300);
        } else {
          // For wrapper elements or non-animated elements
          overlay.parentNode.removeChild(overlay);
        }
      }
    } catch (e) {
      console.error('Error removing overlay:', e);
    }
  });
}

// Set up a mutation observer to detect DOM changes
function setupMutationObserver() {
  if (window.tariffObserver) {
    window.tariffObserver.disconnect();
  }
  
  // Only set up the observer if extension is active
  if (!isExtensionActive) return;
  
  // Create a new observer
  window.tariffObserver = new MutationObserver((mutations) => {
    // Filter and process DOM mutations
    let shouldReprocess = false;
    
    mutations.forEach(mutation => {
      // Check if the mutation involves nodes that might contain prices
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        for (let i = 0; i < mutation.addedNodes.length; i++) {
          const node = mutation.addedNodes[i];
          // Only process element nodes that could contain prices
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Check if this is potentially a product or price element
            // Expanded list of tags and attributes to check for
            if (
                // Common container elements
                node.tagName === 'DIV' || 
                node.tagName === 'SPAN' || 
                node.tagName === 'P' || 
                node.tagName === 'LI' ||
                
                // Price-related class names (common on e-commerce sites)
                (node.className && (
                  node.className.toString().toLowerCase().includes('price') || 
                  node.className.toString().toLowerCase().includes('product') ||
                  node.className.toString().toLowerCase().includes('item') ||
                  node.className.toString().toLowerCase().includes('cost') ||
                  node.className.toString().toLowerCase().includes('amount')
                )) ||
                
                // Price-related ID attributes
                (node.id && (
                  node.id.toLowerCase().includes('price') || 
                  node.id.toLowerCase().includes('product') ||
                  node.id.toLowerCase().includes('cost')
                )) ||
                
                // Check for price-related data attributes
                (node.hasAttribute && (
                  node.hasAttribute('data-price') || 
                  node.hasAttribute('data-product-price') ||
                  node.hasAttribute('itemprop') && 
                  (node.getAttribute('itemprop') === 'price' || 
                   node.getAttribute('itemprop') === 'offers')
                ))
            ) {
              shouldReprocess = true;
              break;
            }
          }
        }
      }
    });
    
    // If relevant mutations were detected, reprocess the page
    if (shouldReprocess) {
      // Use debouncing to prevent excessive processing
      if (window.tariffReprocessTimer) {
        clearTimeout(window.tariffReprocessTimer);
      }
      window.tariffReprocessTimer = setTimeout(() => {
        console.log('[Tariff Calculator] DOM changed, reprocessing page...');
        processPage();
      }, 500);
    }
  });
  
  // Configure and start the observer
  window.tariffObserver.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'style', 'data-price'], // Monitor important attribute changes
    characterData: false // No need to monitor text changes
  });
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'stateChanged') {
    isExtensionActive = message.isActive;
    
    if (isExtensionActive) {
      processPage();
    } else {
      clearOverlays();
      if (window.tariffObserver) {
        window.tariffObserver.disconnect();
      }
    }
    
    sendResponse({ success: true });
  } else if (message.action === 'configUpdated') {
    // Reload configuration and reprocess
    chrome.storage.sync.get('tariffConfig', (result) => {
      if (result.tariffConfig) {
        currentConfig = result.tariffConfig;
        isExtensionActive = currentConfig.isActive;
        
        if (isExtensionActive) {
          processPage();
        } else {
          clearOverlays();
        }
      }
    });
    
    sendResponse({ success: true });
  }
  
  return true; // Required for async response
});

// Initial page processing
window.addEventListener('DOMContentLoaded', () => {
  initialize();
});

// Process the page when it finishes loading resources
window.addEventListener('load', () => {
  // Some sites load prices dynamically after DOMContentLoaded
  setTimeout(() => {
    console.log('[Tariff Calculator] Window load complete, processing page...');
    initialize();
  }, 500);
});

// Add processing on page load as well (in case DOMContentLoaded already fired)
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  console.log('[Tariff Calculator] Document already complete, initializing immediately...');
  initialize();
}
