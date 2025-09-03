#!/usr/bin/env python3
"""
Debug specific test failures
"""

import requests
import json
from datetime import datetime

BACKEND_URL = "https://ridesocial.preview.emergentagent.com/api"

def debug_auth_issues():
    print("🔍 Debugging authentication issues...")
    
    # Test 1: Invalid token
    print("\n1. Testing invalid token...")
    headers = {"Authorization": "Bearer invalid_token_123"}
    response = requests.get(f"{BACKEND_URL}/auth/me", headers=headers)
    print(f"Invalid token response: {response.status_code} - {response.text}")
    
    # Test 2: Missing token
    print("\n2. Testing missing token...")
    response = requests.get(f"{BACKEND_URL}/auth/me")
    print(f"Missing token response: {response.status_code} - {response.text}")
    
    # Test 3: Wrong password
    print("\n3. Testing wrong password...")
    # First register a user
    timestamp = str(int(datetime.now().timestamp()))
    register_data = {
        "username": f"debuguser_{timestamp}",
        "email": f"debug_{timestamp}@test.com",
        "password": "CorrectPass123!",
        "full_name": "Debug User"
    }
    
    response = requests.post(f"{BACKEND_URL}/auth/register", json=register_data)
    if response.status_code == 200:
        print("✅ User registered for debug test")
        
        # Try wrong password
        wrong_login = {
            "email": register_data["email"],
            "password": "WrongPassword123"
        }
        response = requests.post(f"{BACKEND_URL}/auth/login", json=wrong_login)
        print(f"Wrong password response: {response.status_code} - {response.text}")
    
    # Test 4: Invalid vehicle data
    print("\n4. Testing invalid vehicle data...")
    # Need a valid token first
    response = requests.post(f"{BACKEND_URL}/auth/register", json={
        "username": f"vehicletest_{timestamp}",
        "email": f"vehicle_{timestamp}@test.com",
        "password": "TestPass123!",
        "full_name": "Vehicle Test"
    })
    
    if response.status_code == 200:
        token = response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        invalid_vehicle = {
            "make": "",  # Empty required field
            "model": "Test",
            "year": "invalid_year",  # Invalid type
            "type": "invalid_type"  # Invalid enum value
        }
        
        response = requests.post(f"{BACKEND_URL}/vehicles", json=invalid_vehicle, headers=headers)
        print(f"Invalid vehicle data response: {response.status_code} - {response.text}")

if __name__ == "__main__":
    debug_auth_issues()