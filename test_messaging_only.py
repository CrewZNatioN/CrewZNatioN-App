#!/usr/bin/env python3
"""
Quick test for messaging endpoints only
"""

import requests
import json

BASE_URL = "https://crewznation-app-1.preview.emergentagent.com/api"

# Login to get token
login_data = {
    "email": "john.doe@crewznation.com",
    "password": "CrewzNation2025!"
}

response = requests.post(f"{BASE_URL}/auth/login", json=login_data)
if response.status_code != 200:
    print("Failed to login")
    exit(1)

data = response.json()
token = data["access_token"]
user_id = data["user"]["id"]
headers = {"Authorization": f"Bearer {token}"}

print(f"Logged in as user: {user_id}")

# Test get messages endpoint
print("\nTesting get messages endpoint...")
try:
    # First get conversations to find a partner
    conv_response = requests.get(f"{BASE_URL}/messages/conversations", headers=headers)
    print(f"Conversations response: {conv_response.status_code}")
    
    if conv_response.status_code == 200:
        conversations = conv_response.json()
        print(f"Found {len(conversations)} conversations")
        
        if conversations:
            partner_id = conversations[0]["other_user"]["id"]
            print(f"Testing messages with partner: {partner_id}")
            
            # Test get messages
            msg_response = requests.get(f"{BASE_URL}/messages/{partner_id}", headers=headers)
            print(f"Messages response: {msg_response.status_code}")
            
            if msg_response.status_code == 200:
                messages = msg_response.json()
                print(f"Successfully retrieved {len(messages)} messages")
                if messages:
                    print(f"First message: {messages[0]}")
            else:
                print(f"Error: {msg_response.text}")
        else:
            print("No conversations found")
    else:
        print(f"Error getting conversations: {conv_response.text}")
        
except Exception as e:
    print(f"Exception: {e}")