// Utility functions for the tariff calculator extension

/**
 * Detect price elements in the page
 * Uses a combination of regular expressions and element analysis
 * @param {Element} element - DOM element to scan
 * @returns {Array} - Array of price elements and their data
 */
function detectPrices(element) {
  const priceElements = [];
  const textNodes = [];
  
  // Common price selectors for popular e-commerce sites - expanded for broader coverage
  const priceSelectors = [
    // Generic selectors
    '.price', 
    '[data-price]',
    '[data-test-id*="price"]',
    '[data-automation*="price"]',
    '*[class*="price"]', // Match any element with "price" in the class name
    '*[id*="price"]', // Match any element with "price" in the id
    '[itemprop="price"]',
    '[data-testid*="price"]',
    
    // Amazon specific
    '.a-price',
    '.a-offscreen',
    '.p13n-sc-price',
    
    // Walmart specific
    '.product-price-container',
    '.price-group',
    '.price-characteristic',
    '[data-automation-id*="price"]',
    '[class*="price-characteristic"]',
    
    // eBay specific
    '.s-item__price',
    '.x-price-primary',
    '[data-testid="x-price-primary"]',
    '.ux-textspans--BOLD', // Often contains price on eBay
    
    // Other popular sites
    '.product-price', 
    '.offer-price',
    '.price_color',
    '.sales-price',
    '.product__price',
    '.money', // Shopify
    '.current-price', // Best Buy
    '.price-display', // Target
    '.price-row', // Various sites
    '.product-price-value', 
    '.prd-price',
    '.p-price'
  ];

  // Try to find elements by common price selectors first
  priceSelectors.forEach(selector => {
    try {
      const elements = element.querySelectorAll(selector);
      elements.forEach(el => {
        const priceData = extractPriceData(el);
        if (priceData) {
          priceElements.push({
            element: el,
            ...priceData
          });
        }
      });
    } catch (e) {
      console.error('Error in price selector detection:', e);
    }
  });
  
  // Search for specific patterns in attribute values (like data-*)
  try {
    // Find elements with data attributes containing price info
    const allElements = element.querySelectorAll('*');
    allElements.forEach(el => {
      // Check if we've already processed this element
      if (priceElements.some(pe => pe.element === el)) {
        return;
      }
      
      // Check for price-related attributes
      Array.from(el.attributes).forEach(attr => {
        const attrName = attr.name.toLowerCase();
        if (attrName.includes('price') || attrName.includes('cost') || attrName.includes('amount')) {
          const priceData = extractPriceData(el);
          if (priceData) {
            priceElements.push({
              element: el,
              ...priceData
            });
          }
        }
      });
    });
  } catch (e) {
    console.error('Error in attribute-based price detection:', e);
  }
  
  // Always search text nodes for prices, even if we found some with selectors
  // This ensures we catch prices in plain text that might be missed by selectors
  function collectTextNodes(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent.trim();
      if (text.length > 0) {
        textNodes.push(node);
      }
    } else {
      if (node.tagName === 'SCRIPT' || node.tagName === 'STYLE') {
        return; // Skip script and style tags
      }
      for (let i = 0; i < node.childNodes.length; i++) {
        collectTextNodes(node.childNodes[i]);
      }
    }
  }
  
  collectTextNodes(element);
  
  // Process text nodes to find prices
  textNodes.forEach(node => {
    // Skip if parent has already been processed
    let parentProcessed = false;
    let parent = node.parentNode;
    
    while (parent) {
      if (priceElements.some(pe => pe.element === parent)) {
        parentProcessed = true;
        break;
      }
      parent = parent.parentNode;
    }
    
    if (!parentProcessed) {
      const priceData = extractPriceData(node);
      if (priceData) {
        priceElements.push({
          element: node,
          ...priceData
        });
      }
    }
  });
  
  console.log('[Tariff Calculator] Price detection completed. Found elements:', priceElements);
  
  return priceElements;
}

/**
 * Extract price data from an element or text node
 * @param {Node} element - Element or text node to extract from
 * @returns {Object|null} - Price data or null if no price found
 */
function extractPriceData(element) {
  // Get the text content
  let content = '';
  if (element.nodeType === Node.TEXT_NODE) {
    content = element.textContent;
  } else {
    content = element.innerText || element.textContent;
    
    // Check for special data attributes that might contain price information
    if (element.dataset) {
      const priceDataAttrs = ['price', 'amount', 'value', 'cost'];
      for (const attr of priceDataAttrs) {
        if (element.dataset[attr] && !isNaN(parseFloat(element.dataset[attr]))) {
          // If the element has a valid price data attribute, add it to the content
          content += ' ' + element.dataset[attr];
        }
      }
    }
    
    // Check for specific attributes used by e-commerce sites
    const priceAttrs = ['data-price', 'data-product-price', 'data-item-price'];
    for (const attr of priceAttrs) {
      if (element.getAttribute && element.getAttribute(attr)) {
        content += ' ' + element.getAttribute(attr);
      }
    }
  }
  
  if (!content) return null;
  
  // Currency symbols mapping - expanded to support more currencies
  const currencySymbols = {
    '$': 'USD',
    '€': 'EUR',
    '£': 'GBP',
    '¥': 'JPY',
    'CA$': 'CAD',
    'A$': 'AUD',
    'C$': 'CAD',
    '₹': 'INR',
    '₽': 'RUB',
    '₩': 'KRW',
    '฿': 'THB',
    'R$': 'BRL',
    'kr': 'NOK', // Also used for SEK, DKK
    'US$': 'USD',
    'USD$': 'USD',
    '₴': 'UAH',
    'zł': 'PLN',
    'CHF': 'CHF',
    'NZ$': 'NZD',
    'MX$': 'MXN',
    'R': 'ZAR' // South African Rand
  };
  
  // Currency codes 
  const currencyCodes = Object.values(currencySymbols);
  
  // Common price formats to check - more comprehensive patterns
  const priceFormats = [
    // eBay format - often has "US $XX.XX" format
    /US\s*\$\s*([0-9]{1,3}(?:[,.][0-9]{3})*(?:[,.][0-9]{1,2})?)/gi,
    
    // Walmart format often has cents separated and may include "now" or other text
    /\$((?:[0-9]{1,3},)*[0-9]{1,3})\.([0-9]{2})/g,
    
    // Format with currency code explicitly mentioned
    /([A-Z]{3})\s*([0-9]{1,3}(?:[,.][0-9]{3})*(?:[,.][0-9]{1,2})?)/gi,
    
    // Common format with decimal places
    /([0-9]{1,3}(?:,[0-9]{3})*\.[0-9]{2})/g,
    
    // Main price regex - handles most common cases with currency symbols
    new RegExp(
      '(?:' + 
      // Start with either currency symbol or currency code
      '(' + Object.keys(currencySymbols).map(s => s.replace(/[\$\€\£\¥]/g, '\\$&')).join('|') + '|' +
      currencyCodes.join('|') + ')' +
      '\\s*' + // Optional space after currency
      ')?' + // Currency symbol/code is optional (might appear after the number)
      '([0-9]{1,3}(?:[,.\\s][0-9]{3})*(?:[,.][0-9]{1,2})?)' + // The price digits with potential separators
      '(?:\\s*' + // Optional space before currency if it comes after
      '(' + Object.keys(currencySymbols).map(s => s.replace(/[\$\€\£\¥]/g, '\\$&')).join('|') + '|' +
      currencyCodes.join('|') + ')' +
      ')?', // Currency symbol/code might appear after the number
      'gi' // Global, case insensitive
    )
  ];
  
  // Try each price format
  let matches = [];
  for (const regex of priceFormats) {
    matches = [...content.matchAll(regex)];
    if (matches.length > 0) {
      break; // Use the first successful regex
    }
  }
  
  if (matches.length > 0) {
    // Use the first match
    const match = matches[0];
    let currencyCode = 'USD'; // Default
    let currencySymbol = '$'; // Default
    
    // Determine currency from the match
    if (match[1]) { // Currency symbol/code before the price
      if (currencySymbols[match[1]]) {
        currencyCode = currencySymbols[match[1]];
        currencySymbol = match[1];
      } else if (currencyCodes.includes(match[1])) {
        currencyCode = match[1];
        // Find symbol for this code
        for (const [symbol, code] of Object.entries(currencySymbols)) {
          if (code === currencyCode) {
            currencySymbol = symbol;
            break;
          }
        }
      }
    } else if (match[3]) { // Currency symbol/code after the price
      if (currencySymbols[match[3]]) {
        currencyCode = currencySymbols[match[3]];
        currencySymbol = match[3];
      } else if (currencyCodes.includes(match[3])) {
        currencyCode = match[3];
        // Find symbol for this code
        for (const [symbol, code] of Object.entries(currencySymbols)) {
          if (code === currencyCode) {
            currencySymbol = symbol;
            break;
          }
        }
      }
    }
    
    // Parse the price number
    let priceString = match[2];
    // Detect thousands separator and decimal point
    let decimalPoint = '.';
    let thousandsSeparator = ',';
    
    // If the last separator is a comma, it's likely the decimal point
    if (priceString.lastIndexOf(',') > priceString.lastIndexOf('.')) {
      decimalPoint = ',';
      thousandsSeparator = '.';
    }
    
    // Remove thousands separators and normalize decimal point
    priceString = priceString.replace(new RegExp('\\' + thousandsSeparator, 'g'), '')
                             .replace(new RegExp('\\' + decimalPoint), '.');
    
    // Parse the price
    const price = parseFloat(priceString);
    
    if (!isNaN(price) && price > 0) { // Ensure it's a positive number
      console.log(`[Tariff Calculator] Found price: ${price} ${currencyCode} in text: "${content.substring(0, 50)}..."`);
      return {
        price,
        currency: currencyCode,
        symbol: currencySymbol,
        originalText: match[0]
      };
    }
  }
  
  // Special handling for structured data that might be in the page
  if (element.nodeType !== Node.TEXT_NODE) {
    // Look for microdata price properties (Schema.org)
    if (element.getAttribute && (
        element.getAttribute('itemprop') === 'price' || 
        element.getAttribute('property') === 'product:price:amount'
    )) {
      const priceValue = element.getAttribute('content') || element.textContent;
      if (priceValue) {
        const price = parseFloat(priceValue.replace(/[^\d.-]/g, ''));
        if (!isNaN(price) && price > 0) {
          let currencyCode = 'USD';
          // Try to find the currency
          const currencyElement = element.closest('[itemprop="priceCurrency"], [property="product:price:currency"]');
          if (currencyElement) {
            const foundCurrency = currencyElement.getAttribute('content') || currencyElement.textContent;
            if (foundCurrency && currencyCodes.includes(foundCurrency)) {
              currencyCode = foundCurrency;
            }
          }
          
          let currencySymbol = '$';
          for (const [symbol, code] of Object.entries(currencySymbols)) {
            if (code === currencyCode) {
              currencySymbol = symbol;
              break;
            }
          }
          
          console.log(`[Tariff Calculator] Found microdata price: ${price} ${currencyCode}`);
          return {
            price,
            currency: currencyCode,
            symbol: currencySymbol,
            originalText: priceValue
          };
        }
      }
    }
  }
  
  return null;
}

/**
 * Calculate tariff increase
 * @param {number} price - Original price
 * @param {string} currency - Currency code
 * @param {Object} tariffConfig - Tariff configuration
 * @returns {number} - Tariff amount
 */
function calculateTariff(price, currency, tariffConfig) {
  // Get the appropriate tariff rate for the currency
  let rate = tariffConfig.defaultRate;
  
  if (tariffConfig.currencyRates && tariffConfig.currencyRates[currency]) {
    rate = tariffConfig.currencyRates[currency];
  }
  
  // Calculate the tariff amount
  return price * rate / 100;
}

/**
 * Format currency for display
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code
 * @param {string} symbol - Currency symbol
 * @returns {string} - Formatted currency string
 */
function formatCurrency(amount, currency, symbol) {
  try {
    // Try to use Intl.NumberFormat if available
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency
    }).format(amount);
  } catch (e) {
    // Fall back to simple formatting
    const precision = currency === 'JPY' ? 0 : 2;
    return `${symbol}${amount.toFixed(precision)}`;
  }
}
