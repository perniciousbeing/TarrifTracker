#!/usr/bin/env python3
"""
Tariff Scraper
--------------
This script scrapes tariff information from the Trade Compliance Resource Hub
website and formats it for use in the Tariff Calculator Chrome extension.
"""

import json
import sys
import re
import trafilatura
from datetime import datetime

def get_website_text_content(url):
    """
    Fetches and extracts the main text content from a website using trafilatura.
    
    Args:
        url (str): The URL of the website to scrape
        
    Returns:
        str: The extracted text content
    """
    try:
        downloaded = trafilatura.fetch_url(url)
        if not downloaded:
            return None
        
        text = trafilatura.extract(downloaded)
        return text
    except Exception as e:
        print(f"Error fetching website content: {e}", file=sys.stderr)
        return None

def extract_tariff_rates(text):
    """
    Extracts tariff rates from the text content of the Trade Compliance Resource Hub.
    
    Args:
        text (str): The text content to parse
        
    Returns:
        dict: Dictionary containing the extracted tariff rates
    """
    if not text:
        return {'error': 'No text content provided'}
    
    # Initialize the result dictionary
    tariff_data = {
        'defaultRate': 25,  # Default rate
        'currencyRates': {
            'USD': 25,  # Default for USD
            'EUR': 20,  # Default for EUR (to be updated if found)
            'GBP': 22,  # Default for GBP (to be updated if found)
            'CAD': 18,  # Default for CAD (to be updated if found)
            'AUD': 19,  # Default for AUD (to be updated if found)
            'JPY': 15   # Default for JPY (to be updated if found)
        },
        'lastUpdated': datetime.now().isoformat(),
        'source': 'Trade Compliance Resource Hub'
    }
    
    # Look for specific patterns in the text
    # Pattern for China tariffs (most important for our extension)
    china_pattern = r"(?:China|Chinese).*?(?:tariff|tariffs|duty|duties).*?(\d+)%"
    china_matches = re.findall(china_pattern, text, re.IGNORECASE)
    if china_matches:
        # Use the first match as our default rate
        try:
            tariff_data['defaultRate'] = int(china_matches[0])
            tariff_data['currencyRates']['USD'] = int(china_matches[0])
        except (ValueError, IndexError):
            pass
    
    # Pattern for EU tariffs (affects EUR and possibly GBP)
    eu_pattern = r"(?:EU|Europe|European Union).*?(?:tariff|tariffs|duty|duties).*?(\d+)%"
    eu_matches = re.findall(eu_pattern, text, re.IGNORECASE)
    if eu_matches:
        try:
            tariff_data['currencyRates']['EUR'] = int(eu_matches[0])
        except (ValueError, IndexError):
            pass
    
    # Pattern for UK tariffs (affects GBP)
    uk_pattern = r"(?:UK|United Kingdom|Britain).*?(?:tariff|tariffs|duty|duties).*?(\d+)%"
    uk_matches = re.findall(uk_pattern, text, re.IGNORECASE)
    if uk_matches:
        try:
            tariff_data['currencyRates']['GBP'] = int(uk_matches[0])
        except (ValueError, IndexError):
            pass
    
    # Pattern for Canada tariffs (affects CAD)
    canada_pattern = r"(?:Canada|Canadian).*?(?:tariff|tariffs|duty|duties).*?(\d+)%"
    canada_matches = re.findall(canada_pattern, text, re.IGNORECASE)
    if canada_matches:
        try:
            tariff_data['currencyRates']['CAD'] = int(canada_matches[0])
        except (ValueError, IndexError):
            pass
    
    # Pattern for Australia tariffs (affects AUD)
    australia_pattern = r"(?:Australia|Australian).*?(?:tariff|tariffs|duty|duties).*?(\d+)%"
    australia_matches = re.findall(australia_pattern, text, re.IGNORECASE)
    if australia_matches:
        try:
            tariff_data['currencyRates']['AUD'] = int(australia_matches[0])
        except (ValueError, IndexError):
            pass
    
    # Pattern for Japan tariffs (affects JPY)
    japan_pattern = r"(?:Japan|Japanese).*?(?:tariff|tariffs|duty|duties).*?(\d+)%"
    japan_matches = re.findall(japan_pattern, text, re.IGNORECASE)
    if japan_matches:
        try:
            tariff_data['currencyRates']['JPY'] = int(japan_matches[0])
        except (ValueError, IndexError):
            pass
    
    return tariff_data

def main():
    """
    Main function to run the tariff scraper.
    """
    # URL for the Trade Compliance Resource Hub
    url = "https://www.tradecomplianceresourcehub.com/2025/04/29/trump-2-0-tariff-tracker/"
    
    # Fetch the website content
    text_content = get_website_text_content(url)
    if not text_content:
        result = {'error': f'Failed to fetch content from {url}'}
        print(json.dumps(result))
        return 1
    
    # Extract tariff rates
    tariff_data = extract_tariff_rates(text_content)
    
    # Output the result as JSON
    print(json.dumps(tariff_data))
    return 0

if __name__ == "__main__":
    sys.exit(main())