#!/usr/bin/env python3
"""
Focused test to check specific backend issues
"""

import requests
import json
from datetime import datetime

BACKEND_URL = "https://ridesocial.preview.emergentagent.com/api"

def test_specific_issues():
    print("🔍 Testing specific backend issues...")
    
    # Register a test user
    timestamp = str(int(datetime.now().timestamp()))
    test_data = {
        "username": f"focustest_{timestamp}",
        "email": f"focus_{timestamp}@test.com",
        "password": "TestPass123!",
        "full_name": "Focus Test User"
    }
    
    # Register
    response = requests.post(f"{BACKEND_URL}/auth/register", json=test_data)
    if response.status_code != 200:
        print(f"❌ Registration failed: {response.status_code} - {response.text}")
        return
    
    auth_data = response.json()
    token = auth_data["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    print("✅ User registered successfully")
    
    # Test 1: Vehicle image endpoint
    print("\n1. Testing vehicle image endpoint...")
    
    # Create vehicle first
    vehicle_data = {
        "make": "Test",
        "model": "Car",
        "year": 2023,
        "type": "car"
    }
    
    response = requests.post(f"{BACKEND_URL}/vehicles", json=vehicle_data, headers=headers)
    if response.status_code == 200:
        vehicle_id = response.json()["id"]
        print(f"✅ Vehicle created: {vehicle_id}")
        
        # Test image upload
        image_data = {"image_base64": "test_image_data"}
        response = requests.post(f"{BACKEND_URL}/vehicles/{vehicle_id}/images", json=image_data, headers=headers)
        print(f"Vehicle image upload: {response.status_code} - {response.text}")
    
    # Test 2: Social feed endpoint
    print("\n2. Testing social feed endpoint...")
    
    # Create a post first
    post_data = {
        "caption": "Test post for feed",
        "images": ["test_image"]
    }
    
    response = requests.post(f"{BACKEND_URL}/posts", json=post_data, headers=headers)
    if response.status_code == 200:
        print("✅ Post created successfully")
        
        # Test feed
        response = requests.get(f"{BACKEND_URL}/posts/feed", headers=headers)
        print(f"Social feed: {response.status_code}")
        if response.status_code != 200:
            print(f"Feed error: {response.text}")
        else:
            print("✅ Feed working")
    
    # Test 3: Error handling
    print("\n3. Testing error handling...")
    
    # Test invalid token
    bad_headers = {"Authorization": "Bearer invalid_token"}
    response = requests.get(f"{BACKEND_URL}/auth/me", headers=bad_headers)
    print(f"Invalid token test: {response.status_code} (should be 401)")
    
    # Test duplicate registration
    response = requests.post(f"{BACKEND_URL}/auth/register", json=test_data)
    print(f"Duplicate registration: {response.status_code} (should be 400)")
    
    # Test wrong password
    wrong_login = {
        "email": test_data["email"],
        "password": "WrongPassword"
    }
    response = requests.post(f"{BACKEND_URL}/auth/login", json=wrong_login)
    print(f"Wrong password: {response.status_code} (should be 401)")

if __name__ == "__main__":
    test_specific_issues()