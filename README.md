# Tariff Tracker Chrome Extension

<div align="center">
  <img src="img/tarifftracker_logo.png" alt="Tariff Tracker Logo" width="300">
  <h3>Track and calculate tariff increases on product prices across the web</h3>
</div>

## Overview

Tariff Tracker is a Chrome extension that automatically identifies prices on e-commerce websites and overlays the calculated tariff increases along with the final price. It works across multiple online shopping platforms including Amazon, Walmart, eBay, Etsy, and many more.

### Features

- **Automatic Price Detection**: Identifies prices across various e-commerce sites
- **Real-time Tariff Calculation**: Shows both the tariff amount and final price
- **Multiple Currency Support**: Works with USD, EUR, GBP, CAD, AUD, JPY and others
- **Customizable Tariff Rates**: Set different rates for different currencies
- **Auto-update Functionality**: Automatically updates tariff data from the Trade Compliance Resource Hub
- **Display Options**: Choose between inline display or tooltip for price information

## Installation

### Method 1: Install from Chrome Web Store (Recommended)

1. Visit the [Chrome Web Store](https://chrome.google.com/webstore) (link to be updated when published)
2. Search for "Tariff Tracker" or navigate directly to the extension page
3. Click "Add to Chrome"
4. Confirm by clicking "Add extension" in the popup dialog

### Method 2: Manual Installation (Developer Mode)

1. **Download the Extension**:
   - Download the latest release from the [Releases page](https://github.com/username/tariff-tracker/releases) (link to be updated)
   - Or clone this repository:
     ```
     git clone https://github.com/username/tariff-tracker.git
     ```

2. **Load the Extension in Chrome**:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" by toggling the switch in the top right corner
   - Click "Load unpacked"
   - Select the directory containing the extension files (the folder with the manifest.json file)

3. **Verify Installation**:
   - The Tariff Tracker icon should appear in your browser toolbar
   - Click the icon to open the extension popup and configure settings

## Usage

### Basic Usage

1. Navigate to any e-commerce website (Amazon, Walmart, eBay, etc.)
2. The extension automatically identifies prices on the page
3. For each price, the extension shows:
   - The original price
   - The additional tariff amount
   - The final price (original + tariff)

### Configuration Options

Click on the extension icon to open the settings popup:

- **Enable/Disable**: Toggle the extension on or off
- **Display Style**: Choose between inline display or tooltip
- **Tariff Rates**: Set default rate and currency-specific rates
- **Auto-update**: Enable/disable automatic tariff rate updates
- **Manual Update**: Trigger an immediate update of tariff rates

## How It Works

The extension uses advanced DOM traversal to identify price elements across different websites. For each detected price:

1. The currency is identified based on the symbol or code
2. The appropriate tariff rate is applied based on the currency
3. The tariff amount and final price are calculated
4. The information is displayed according to your preferred display style

For tariff data, the extension connects to the [Trade Compliance Resource Hub](https://www.tradecomplianceresourcehub.com/2025/04/29/trump-2-0-tariff-tracker/) to ensure you always have the most current tariff rates.

## Troubleshooting

### Common Issues

- **Prices not detected**: Some websites use unconventional methods to display prices. Try refreshing the page or reporting the website through the feedback form.
- **Extension not working**: Make sure the extension is enabled. Try toggling it off and on again.
- **Wrong currency detected**: You can manually set rates for each currency in the settings.

### Reporting Issues

If you encounter any problems or have suggestions for improvement, please:

1. Check the [Known Issues](https://github.com/username/tariff-tracker/issues) page
2. Submit a new issue if your problem isn't already listed
3. Contact support directly at p3rnicious@mail.com

## Privacy Policy

Tariff Tracker respects your privacy:

- The extension only reads content on the web pages you visit to identify and calculate tariff amounts
- No personal data is collected or stored
- No browsing history is tracked
- No data is shared with third parties

## Credits

- **Author**: Pernicious
- **Contact**: p3rnicious@mail.com
- **Icon & Logo**: Custom design by Pernicious
- **Data Source**: [Trade Compliance Resource Hub](https://www.tradecomplianceresourcehub.com/2025/04/29/trump-2-0-tariff-tracker/)

## License

This project is licensed under the MIT License - see the LICENSE file for details.

---

<div align="center">
  <p>Copyright &copy; 2025 Pernicious. All rights reserved.</p>
</div>