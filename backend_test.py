#!/usr/bin/env python3
"""
CREWZ NATION Backend API Testing Suite
Tests all backend APIs for the automotive social media platform
"""

import requests
import json
import base64
from datetime import datetime, timedelta
import uuid
import time

# Configuration
BASE_URL = "https://car-social-app.preview.emergentagent.com/api"
TEST_USER_EMAIL = "john.doe@crewznation.com"
TEST_USER_USERNAME = "johndoe_crewz"
TEST_USER_PASSWORD = "CrewzNation2025!"

class CrewzNationAPITester:
    def __init__(self):
        self.base_url = BASE_URL
        self.access_token = None
        self.user_id = None
        self.test_results = {
            "jwt_auth": {"passed": 0, "failed": 0, "details": []},
            "oauth": {"passed": 0, "failed": 0, "details": []},
            "vehicles": {"passed": 0, "failed": 0, "details": []},
            "posts": {"passed": 0, "failed": 0, "details": []},
            "events": {"passed": 0, "failed": 0, "details": []}
        }
        
    def log_result(self, category, test_name, success, message, response_data=None):
        """Log test results"""
        if success:
            self.test_results[category]["passed"] += 1
            status = "✅ PASS"
        else:
            self.test_results[category]["failed"] += 1
            status = "❌ FAIL"
            
        detail = {
            "test": test_name,
            "status": status,
            "message": message,
            "response": response_data
        }
        self.test_results[category]["details"].append(detail)
        print(f"{status}: {test_name} - {message}")
        
    def generate_base64_image(self):
        """Generate a small base64 encoded test image"""
        # Simple 1x1 pixel PNG in base64
        return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
    
    def test_jwt_authentication(self):
        """Test JWT Authentication System"""
        print("\n🔐 Testing JWT Authentication System...")
        
        # Test 1: User Registration
        try:
            register_data = {
                "email": TEST_USER_EMAIL,
                "username": TEST_USER_USERNAME,
                "password": TEST_USER_PASSWORD
            }
            
            response = requests.post(f"{self.base_url}/auth/register", json=register_data)
            
            if response.status_code == 200:
                data = response.json()
                if "access_token" in data and "user" in data:
                    self.access_token = data["access_token"]
                    self.user_id = data["user"]["id"]
                    self.log_result("jwt_auth", "User Registration", True, 
                                  f"Successfully registered user {TEST_USER_USERNAME}")
                else:
                    self.log_result("jwt_auth", "User Registration", False, 
                                  "Registration response missing required fields", data)
            elif response.status_code == 400 and "already registered" in response.text:
                self.log_result("jwt_auth", "User Registration", True, 
                              "User already exists (expected for repeat tests)")
            else:
                self.log_result("jwt_auth", "User Registration", False, 
                              f"Registration failed with status {response.status_code}", response.text)
                
        except Exception as e:
            self.log_result("jwt_auth", "User Registration", False, f"Exception: {str(e)}")
        
        # Test 2: User Login
        try:
            login_data = {
                "email": TEST_USER_EMAIL,
                "password": TEST_USER_PASSWORD
            }
            
            response = requests.post(f"{self.base_url}/auth/login", json=login_data)
            
            if response.status_code == 200:
                data = response.json()
                if "access_token" in data and "user" in data:
                    self.access_token = data["access_token"]
                    self.user_id = data["user"]["id"]
                    self.log_result("jwt_auth", "User Login", True, 
                                  f"Successfully logged in user {TEST_USER_USERNAME}")
                else:
                    self.log_result("jwt_auth", "User Login", False, 
                                  "Login response missing required fields", data)
            else:
                self.log_result("jwt_auth", "User Login", False, 
                              f"Login failed with status {response.status_code}", response.text)
                
        except Exception as e:
            self.log_result("jwt_auth", "User Login", False, f"Exception: {str(e)}")
        
        # Test 3: Token Validation (via protected endpoint)
        if self.access_token:
            try:
                headers = {"Authorization": f"Bearer {self.access_token}"}
                response = requests.get(f"{self.base_url}/posts/feed", headers=headers)
                
                if response.status_code == 200:
                    self.log_result("jwt_auth", "Token Validation", True, 
                                  "JWT token successfully validated via protected endpoint")
                else:
                    self.log_result("jwt_auth", "Token Validation", False, 
                                  f"Token validation failed with status {response.status_code}")
                    
            except Exception as e:
                self.log_result("jwt_auth", "Token Validation", False, f"Exception: {str(e)}")
        else:
            self.log_result("jwt_auth", "Token Validation", False, "No access token available for validation")
    
    def test_oauth_integration(self):
        """Test Emergent Google OAuth Integration"""
        print("\n🔗 Testing Emergent Google OAuth Integration...")
        
        # Test OAuth Session Validation (without actual session ID)
        try:
            # This will fail without a real session ID, but we can test the endpoint structure
            headers = {"X-Session-ID": "test-session-id-123"}
            response = requests.get(f"{self.base_url}/auth/session", headers=headers)
            
            # We expect this to fail with 401, which means the endpoint is working
            if response.status_code == 401:
                self.log_result("oauth", "OAuth Session Endpoint", True, 
                              "OAuth session endpoint is accessible and properly validates sessions")
            else:
                self.log_result("oauth", "OAuth Session Endpoint", False, 
                              f"Unexpected response status {response.status_code}", response.text)
                
        except Exception as e:
            self.log_result("oauth", "OAuth Session Endpoint", False, f"Exception: {str(e)}")
    
    def test_vehicle_database(self):
        """Test Vehicle Database with 1000+ Cars"""
        print("\n🚗 Testing Vehicle Database...")
        
        # Test 1: Initialize Vehicles
        try:
            response = requests.post(f"{self.base_url}/init/vehicles")
            
            if response.status_code == 200:
                data = response.json()
                self.log_result("vehicles", "Vehicle Initialization", True, 
                              f"Vehicle initialization: {data.get('message', 'Success')}")
            else:
                self.log_result("vehicles", "Vehicle Initialization", False, 
                              f"Vehicle initialization failed with status {response.status_code}")
                
        except Exception as e:
            self.log_result("vehicles", "Vehicle Initialization", False, f"Exception: {str(e)}")
        
        # Test 2: Get All Vehicles
        try:
            response = requests.get(f"{self.base_url}/vehicles")
            
            if response.status_code == 200:
                vehicles = response.json()
                if isinstance(vehicles, list) and len(vehicles) > 0:
                    self.log_result("vehicles", "Vehicle Listing", True, 
                                  f"Successfully retrieved {len(vehicles)} vehicles")
                else:
                    self.log_result("vehicles", "Vehicle Listing", False, 
                                  "No vehicles found in database")
            else:
                self.log_result("vehicles", "Vehicle Listing", False, 
                              f"Vehicle listing failed with status {response.status_code}")
                
        except Exception as e:
            self.log_result("vehicles", "Vehicle Listing", False, f"Exception: {str(e)}")
        
        # Test 3: Search Vehicles by Make
        try:
            response = requests.get(f"{self.base_url}/vehicles?make=BMW")
            
            if response.status_code == 200:
                vehicles = response.json()
                if isinstance(vehicles, list):
                    bmw_count = len([v for v in vehicles if "BMW" in v.get("make", "")])
                    self.log_result("vehicles", "Vehicle Search by Make", True, 
                                  f"Found {bmw_count} BMW vehicles")
                else:
                    self.log_result("vehicles", "Vehicle Search by Make", False, 
                                  "Invalid response format for vehicle search")
            else:
                self.log_result("vehicles", "Vehicle Search by Make", False, 
                              f"Vehicle search failed with status {response.status_code}")
                
        except Exception as e:
            self.log_result("vehicles", "Vehicle Search by Make", False, f"Exception: {str(e)}")
        
        # Test 4: Search Vehicles by Year
        try:
            response = requests.get(f"{self.base_url}/vehicles?year=2023")
            
            if response.status_code == 200:
                vehicles = response.json()
                if isinstance(vehicles, list):
                    year_2023_count = len([v for v in vehicles if v.get("year") == 2023])
                    self.log_result("vehicles", "Vehicle Search by Year", True, 
                                  f"Found {year_2023_count} vehicles from 2023")
                else:
                    self.log_result("vehicles", "Vehicle Search by Year", False, 
                                  "Invalid response format for year search")
            else:
                self.log_result("vehicles", "Vehicle Search by Year", False, 
                              f"Vehicle year search failed with status {response.status_code}")
                
        except Exception as e:
            self.log_result("vehicles", "Vehicle Search by Year", False, f"Exception: {str(e)}")
    
    def test_posts_feed_api(self):
        """Test Posts Feed API"""
        print("\n📱 Testing Posts Feed API...")
        
        if not self.access_token:
            self.log_result("posts", "Posts API Setup", False, "No access token available for posts testing")
            return
        
        headers = {"Authorization": f"Bearer {self.access_token}"}
        
        # Test 1: Create Post with Base64 Image
        try:
            post_data = {
                "image": self.generate_base64_image(),
                "caption": "Just picked up my new BMW M3! The performance is incredible 🔥 #CrewzNation #BMW #M3",
                "vehicle_id": None  # We'll get a vehicle ID first
            }
            
            # Get a vehicle ID first
            vehicles_response = requests.get(f"{self.base_url}/vehicles?make=BMW")
            if vehicles_response.status_code == 200:
                vehicles = vehicles_response.json()
                if vehicles:
                    post_data["vehicle_id"] = vehicles[0].get("id")
            
            response = requests.post(f"{self.base_url}/posts", json=post_data, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                if "post_id" in data:
                    self.created_post_id = data["post_id"]
                    self.log_result("posts", "Post Creation", True, 
                                  "Successfully created post with base64 image and vehicle tag")
                else:
                    self.log_result("posts", "Post Creation", False, 
                                  "Post creation response missing post_id", data)
            else:
                self.log_result("posts", "Post Creation", False, 
                              f"Post creation failed with status {response.status_code}", response.text)
                
        except Exception as e:
            self.log_result("posts", "Post Creation", False, f"Exception: {str(e)}")
        
        # Test 2: Get Posts Feed
        try:
            response = requests.get(f"{self.base_url}/posts/feed", headers=headers)
            
            if response.status_code == 200:
                posts = response.json()
                if isinstance(posts, list):
                    self.log_result("posts", "Feed Retrieval", True, 
                                  f"Successfully retrieved feed with {len(posts)} posts")
                    
                    # Verify post structure
                    if posts:
                        post = posts[0]
                        required_fields = ["_id", "user", "image", "caption", "likes", "comments", "createdAt"]
                        missing_fields = [field for field in required_fields if field not in post]
                        
                        if not missing_fields:
                            self.log_result("posts", "Post Structure Validation", True, 
                                          "Post objects contain all required fields")
                        else:
                            self.log_result("posts", "Post Structure Validation", False, 
                                          f"Posts missing fields: {missing_fields}")
                else:
                    self.log_result("posts", "Feed Retrieval", False, 
                                  "Feed response is not a list")
            else:
                self.log_result("posts", "Feed Retrieval", False, 
                              f"Feed retrieval failed with status {response.status_code}")
                
        except Exception as e:
            self.log_result("posts", "Feed Retrieval", False, f"Exception: {str(e)}")
        
        # Test 3: Like Post Functionality
        if hasattr(self, 'created_post_id'):
            try:
                response = requests.post(f"{self.base_url}/posts/{self.created_post_id}/like", headers=headers)
                
                if response.status_code == 200:
                    data = response.json()
                    if "message" in data:
                        self.log_result("posts", "Post Like Functionality", True, 
                                      "Successfully liked post")
                    else:
                        self.log_result("posts", "Post Like Functionality", False, 
                                      "Like response missing message", data)
                else:
                    self.log_result("posts", "Post Like Functionality", False, 
                                  f"Post like failed with status {response.status_code}")
                    
            except Exception as e:
                self.log_result("posts", "Post Like Functionality", False, f"Exception: {str(e)}")
        else:
            self.log_result("posts", "Post Like Functionality", False, "No post ID available for like test")
    
    def test_events_api(self):
        """Test Events API System"""
        print("\n📅 Testing Events API System...")
        
        if not self.access_token:
            self.log_result("events", "Events API Setup", False, "No access token available for events testing")
            return
        
        headers = {"Authorization": f"Bearer {self.access_token}"}
        
        # Test 1: Create Event
        try:
            event_data = {
                "title": "CREWZ NATION Car Meet - Downtown",
                "description": "Join us for an epic car meet in downtown! Bring your rides and let's show off some automotive excellence. Food trucks, music, and great vibes guaranteed! 🚗🔥",
                "date": (datetime.now() + timedelta(days=7)).isoformat(),
                "location": "Downtown Convention Center, 123 Main St",
                "image": self.generate_base64_image()
            }
            
            response = requests.post(f"{self.base_url}/events", json=event_data, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                if "event_id" in data:
                    self.created_event_id = data["event_id"]
                    self.log_result("events", "Event Creation", True, 
                                  "Successfully created car meet event")
                else:
                    self.log_result("events", "Event Creation", False, 
                                  "Event creation response missing event_id", data)
            else:
                self.log_result("events", "Event Creation", False, 
                              f"Event creation failed with status {response.status_code}", response.text)
                
        except Exception as e:
            self.log_result("events", "Event Creation", False, f"Exception: {str(e)}")
        
        # Test 2: Get Events List
        try:
            response = requests.get(f"{self.base_url}/events")
            
            if response.status_code == 200:
                events = response.json()
                if isinstance(events, list):
                    self.log_result("events", "Events Retrieval", True, 
                                  f"Successfully retrieved {len(events)} events")
                    
                    # Verify event structure
                    if events:
                        event = events[0]
                        required_fields = ["id", "title", "description", "date", "location", "organizer_id"]
                        missing_fields = [field for field in required_fields if field not in event]
                        
                        if not missing_fields:
                            self.log_result("events", "Event Structure Validation", True, 
                                          "Event objects contain all required fields")
                        else:
                            self.log_result("events", "Event Structure Validation", False, 
                                          f"Events missing fields: {missing_fields}")
                else:
                    self.log_result("events", "Events Retrieval", False, 
                                  "Events response is not a list")
            else:
                self.log_result("events", "Events Retrieval", False, 
                              f"Events retrieval failed with status {response.status_code}")
                
        except Exception as e:
            self.log_result("events", "Events Retrieval", False, f"Exception: {str(e)}")
    
    def run_all_tests(self):
        """Run all backend API tests"""
        print("🚀 Starting CREWZ NATION Backend API Tests...")
        print(f"Base URL: {self.base_url}")
        print("=" * 60)
        
        # Run all test suites
        self.test_jwt_authentication()
        self.test_oauth_integration()
        self.test_vehicle_database()
        self.test_posts_feed_api()
        self.test_events_api()
        
        # Print summary
        self.print_summary()
    
    def print_summary(self):
        """Print test results summary"""
        print("\n" + "=" * 60)
        print("🏁 CREWZ NATION Backend API Test Results Summary")
        print("=" * 60)
        
        total_passed = 0
        total_failed = 0
        
        for category, results in self.test_results.items():
            passed = results["passed"]
            failed = results["failed"]
            total_passed += passed
            total_failed += failed
            
            category_name = {
                "jwt_auth": "JWT Authentication",
                "oauth": "OAuth Integration", 
                "vehicles": "Vehicle Database",
                "posts": "Posts Feed API",
                "events": "Events API"
            }.get(category, category)
            
            status = "✅" if failed == 0 else "❌" if passed == 0 else "⚠️"
            print(f"{status} {category_name}: {passed} passed, {failed} failed")
            
            # Print failed test details
            if failed > 0:
                for detail in results["details"]:
                    if "❌ FAIL" in detail["status"]:
                        print(f"   - {detail['test']}: {detail['message']}")
        
        print("-" * 60)
        print(f"📊 Overall Results: {total_passed} passed, {total_failed} failed")
        
        if total_failed == 0:
            print("🎉 All backend APIs are working correctly!")
        elif total_passed > total_failed:
            print("⚠️  Most APIs working, some issues need attention")
        else:
            print("❌ Critical issues found, backend needs fixes")
        
        return total_passed, total_failed

if __name__ == "__main__":
    tester = CrewzNationAPITester()
    tester.run_all_tests()