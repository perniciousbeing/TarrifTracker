#!/usr/bin/env python3
import os
import base64

# Create img directory if it doesn't exist
os.makedirs('icons/new', exist_ok=True)
os.makedirs('img', exist_ok=True)

# Copy the logo to the respective files
with open('attached_assets/ttrackerlogo.png', 'rb') as f_in, open('img/ttrackerlogo.png', 'wb') as f_out:
    f_out.write(f_in.read())

with open('attached_assets/tarifftracker_logo.png', 'rb') as f_in, open('img/tarifftracker_logo.png', 'wb') as f_out:
    f_out.write(f_in.read())

# Now create the icon files for the extension
with open('attached_assets/ttrackerlogo.png', 'rb') as f_in:
    icon_data = f_in.read()
    
    # Create different sizes
    with open('icons/new/icon16.png', 'wb') as f_out:
        f_out.write(icon_data)
    
    with open('icons/new/icon48.png', 'wb') as f_out:
        f_out.write(icon_data)
    
    with open('icons/new/icon128.png', 'wb') as f_out:
        f_out.write(icon_data)

print("Assets downloaded and copied successfully!")