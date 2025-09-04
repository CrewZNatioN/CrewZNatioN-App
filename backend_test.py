#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for CrewZNatioN
Tests all authentication, vehicle management, and social features
"""

import requests
import json
import base64
import uuid
from datetime import datetime
import sys
import os

# Get backend URL from environment
BACKEND_URL = "https://car-social.preview.emergentagent.com/api"

class CrewZNationAPITester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.session = requests.Session()
        self.auth_token = None
        self.test_user_id = None
        self.test_vehicle_id = None
        self.test_post_id = None
        self.results = {
            "authentication": {"passed": 0, "failed": 0, "details": []},
            "vehicle_management": {"passed": 0, "failed": 0, "details": []},
            "social_features": {"passed": 0, "failed": 0, "details": []},
            "error_handling": {"passed": 0, "failed": 0, "details": []}
        }
        
    def log_result(self, category, test_name, passed, details=""):
        """Log test result"""
        if passed:
            self.results[category]["passed"] += 1
            status = "✅ PASS"
        else:
            self.results[category]["failed"] += 1
            status = "❌ FAIL"
        
        self.results[category]["details"].append(f"{status}: {test_name} - {details}")
        print(f"{status}: {test_name} - {details}")
    
    def make_request(self, method, endpoint, data=None, headers=None, expect_error=False):
        """Make HTTP request with error handling"""
        url = f"{self.base_url}{endpoint}"
        
        if headers is None:
            headers = {}
        
        if self.auth_token and "Authorization" not in headers:
            headers["Authorization"] = f"Bearer {self.auth_token}"
        
        try:
            if method.upper() == "GET":
                response = self.session.get(url, headers=headers)
            elif method.upper() == "POST":
                headers["Content-Type"] = "application/json"
                response = self.session.post(url, json=data, headers=headers)
            elif method.upper() == "PUT":
                headers["Content-Type"] = "application/json"
                response = self.session.put(url, json=data, headers=headers)
            elif method.upper() == "DELETE":
                response = self.session.delete(url, headers=headers)
            
            if expect_error:
                return response
            
            if response.status_code >= 400:
                print(f"Request failed: {method} {url}")
                print(f"Status: {response.status_code}")
                print(f"Response: {response.text}")
                return None
            
            return response
            
        except Exception as e:
            print(f"Request error: {e}")
            return None
    
    def test_authentication(self):
        """Test all authentication endpoints"""
        print("\n=== TESTING AUTHENTICATION ===")
        
        # Generate unique test data
        timestamp = str(int(datetime.now().timestamp()))
        test_username = f"testuser_{timestamp}"
        test_email = f"test_{timestamp}@crewznation.com"
        test_password = "SecurePass123!"
        test_full_name = "Test User CrewZ"
        
        # Test 1: User Registration
        register_data = {
            "username": test_username,
            "email": test_email,
            "password": test_password,
            "full_name": test_full_name
        }
        
        response = self.make_request("POST", "/auth/register", register_data)
        if response and response.status_code == 200:
            data = response.json()
            if "access_token" in data and "user" in data:
                self.auth_token = data["access_token"]
                self.test_user_id = data["user"]["id"]
                self.log_result("authentication", "User Registration", True, 
                              f"User created with ID: {self.test_user_id}")
            else:
                self.log_result("authentication", "User Registration", False, 
                              "Missing token or user in response")
        else:
            self.log_result("authentication", "User Registration", False, 
                          f"Registration failed: {response.status_code if response else 'No response'}")
        
        # Test 2: User Login
        login_data = {
            "email": test_email,
            "password": test_password
        }
        
        response = self.make_request("POST", "/auth/login", login_data)
        if response and response.status_code == 200:
            data = response.json()
            if "access_token" in data and data["access_token"]:
                self.log_result("authentication", "User Login", True, "Login successful with valid token")
            else:
                self.log_result("authentication", "User Login", False, "No access token in login response")
        else:
            self.log_result("authentication", "User Login", False, 
                          f"Login failed: {response.status_code if response else 'No response'}")
        
        # Test 3: Get Current User (Protected Route)
        response = self.make_request("GET", "/auth/me")
        if response and response.status_code == 200:
            data = response.json()
            if data.get("id") == self.test_user_id:
                self.log_result("authentication", "Protected Route Access", True, 
                              "Successfully accessed protected route with JWT")
            else:
                self.log_result("authentication", "Protected Route Access", False, 
                              "User ID mismatch in protected route")
        else:
            self.log_result("authentication", "Protected Route Access", False, 
                          "Failed to access protected route")
        
        # Test 4: Invalid Token Access
        old_token = self.auth_token
        self.auth_token = "invalid_token_123"
        response = self.make_request("GET", "/auth/me", expect_error=True)
        if response and response.status_code == 401:
            self.log_result("authentication", "Invalid Token Rejection", True, 
                          "Correctly rejected invalid token")
        else:
            self.log_result("authentication", "Invalid Token Rejection", False, 
                          "Should have rejected invalid token")
        
        # Restore valid token
        self.auth_token = old_token
        
        # Test 5: Password Hashing Verification (indirect test via login)
        wrong_password_data = {
            "email": test_email,
            "password": "WrongPassword123"
        }
        
        response = self.make_request("POST", "/auth/login", wrong_password_data, expect_error=True)
        if response and response.status_code == 401:
            self.log_result("authentication", "Password Hashing Security", True, 
                          "Correctly rejected wrong password")
        else:
            self.log_result("authentication", "Password Hashing Security", False, 
                          "Should have rejected wrong password")
    
    def test_vehicle_management(self):
        """Test all vehicle management endpoints"""
        print("\n=== TESTING VEHICLE MANAGEMENT ===")
        
        if not self.auth_token:
            self.log_result("vehicle_management", "All Vehicle Tests", False, 
                          "No auth token available")
            return
        
        # Test 1: Create Vehicle
        vehicle_data = {
            "make": "Toyota",
            "model": "Supra",
            "year": 2023,
            "type": "car",
            "color": "Red",
            "description": "Modified street racing beast",
            "modifications": "Turbo upgrade, custom exhaust, lowered suspension"
        }
        
        response = self.make_request("POST", "/vehicles", vehicle_data)
        if response and response.status_code == 200:
            data = response.json()
            if "id" in data and data.get("make") == "Toyota":
                self.test_vehicle_id = data["id"]
                self.log_result("vehicle_management", "Create Vehicle", True, 
                              f"Vehicle created with ID: {self.test_vehicle_id}")
            else:
                self.log_result("vehicle_management", "Create Vehicle", False, 
                              "Vehicle data incomplete in response")
        else:
            self.log_result("vehicle_management", "Create Vehicle", False, 
                          f"Failed to create vehicle: {response.status_code if response else 'No response'}")
        
        # Test 2: Get My Vehicles
        response = self.make_request("GET", "/vehicles/my")
        if response and response.status_code == 200:
            data = response.json()
            if isinstance(data, list) and len(data) > 0:
                found_vehicle = any(v.get("id") == self.test_vehicle_id for v in data)
                if found_vehicle:
                    self.log_result("vehicle_management", "Retrieve User Vehicles", True, 
                                  f"Found {len(data)} vehicles including test vehicle")
                else:
                    self.log_result("vehicle_management", "Retrieve User Vehicles", False, 
                                  "Test vehicle not found in user's vehicles")
            else:
                self.log_result("vehicle_management", "Retrieve User Vehicles", False, 
                              "No vehicles returned or invalid format")
        else:
            self.log_result("vehicle_management", "Retrieve User Vehicles", False, 
                          "Failed to retrieve vehicles")
        
        # Test 3: Update Vehicle
        if self.test_vehicle_id:
            update_data = {
                "make": "Toyota",
                "model": "Supra",
                "year": 2023,
                "type": "car",
                "color": "Blue",  # Changed color
                "description": "Updated description - track-ready beast",
                "modifications": "Full race setup with roll cage"
            }
            
            response = self.make_request("PUT", f"/vehicles/{self.test_vehicle_id}", update_data)
            if response and response.status_code == 200:
                self.log_result("vehicle_management", "Update Vehicle", True, 
                              "Vehicle updated successfully")
            else:
                self.log_result("vehicle_management", "Update Vehicle", False, 
                              "Failed to update vehicle")
        
        # Test 4: Add Vehicle Image
        if self.test_vehicle_id:
            # Create a simple base64 image (1x1 pixel PNG)
            test_image_b64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
            
            image_data = {"image_base64": test_image_b64}
            response = self.make_request("POST", f"/vehicles/{self.test_vehicle_id}/images", image_data)
            if response and response.status_code == 200:
                self.log_result("vehicle_management", "Add Vehicle Image", True, 
                              "Image added to vehicle successfully")
            else:
                self.log_result("vehicle_management", "Add Vehicle Image", False, 
                              "Failed to add image to vehicle")
        
        # Test 5: Vehicle Count Update (check user profile)
        response = self.make_request("GET", "/auth/me")
        if response and response.status_code == 200:
            data = response.json()
            if data.get("vehicles_count", 0) > 0:
                self.log_result("vehicle_management", "Vehicle Count Update", True, 
                              f"User vehicle count: {data.get('vehicles_count')}")
            else:
                self.log_result("vehicle_management", "Vehicle Count Update", False, 
                              "Vehicle count not updated in user profile")
        
        # Test 6: Delete Vehicle
        if self.test_vehicle_id:
            response = self.make_request("DELETE", f"/vehicles/{self.test_vehicle_id}")
            if response and response.status_code == 200:
                self.log_result("vehicle_management", "Delete Vehicle", True, 
                              "Vehicle deleted successfully")
                # Verify it's actually deleted
                response = self.make_request("GET", "/vehicles/my")
                if response and response.status_code == 200:
                    data = response.json()
                    found_vehicle = any(v.get("id") == self.test_vehicle_id for v in data)
                    if not found_vehicle:
                        self.log_result("vehicle_management", "Verify Vehicle Deletion", True, 
                                      "Vehicle successfully removed from user's vehicles")
                    else:
                        self.log_result("vehicle_management", "Verify Vehicle Deletion", False, 
                                      "Vehicle still exists after deletion")
            else:
                self.log_result("vehicle_management", "Delete Vehicle", False, 
                              "Failed to delete vehicle")
    
    def test_social_features(self):
        """Test all social features endpoints"""
        print("\n=== TESTING SOCIAL FEATURES ===")
        
        if not self.auth_token:
            self.log_result("social_features", "All Social Tests", False, 
                          "No auth token available")
            return
        
        # First create a vehicle for posts
        vehicle_data = {
            "make": "Honda",
            "model": "Civic Type R",
            "year": 2022,
            "type": "car",
            "color": "White",
            "description": "Track day special"
        }
        
        response = self.make_request("POST", "/vehicles", vehicle_data)
        vehicle_id = None
        if response and response.status_code == 200:
            vehicle_id = response.json().get("id")
        
        # Test 1: Create Post
        test_image_b64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
        
        post_data = {
            "vehicle_id": vehicle_id,
            "caption": "Just finished a track day session! 🏁 The Type R handled beautifully on the corners. #TrackDay #TypeR #CrewZNation",
            "images": [test_image_b64]
        }
        
        response = self.make_request("POST", "/posts", post_data)
        if response and response.status_code == 200:
            data = response.json()
            if "id" in data and data.get("caption"):
                self.test_post_id = data["id"]
                self.log_result("social_features", "Create Post", True, 
                              f"Post created with ID: {self.test_post_id}")
            else:
                self.log_result("social_features", "Create Post", False, 
                              "Post data incomplete in response")
        else:
            self.log_result("social_features", "Create Post", False, 
                          f"Failed to create post: {response.status_code if response else 'No response'}")
        
        # Test 2: Get Social Feed
        response = self.make_request("GET", "/posts/feed")
        if response and response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                found_post = any(p.get("id") == self.test_post_id for p in data)
                has_user_data = any("user" in p for p in data if p.get("id") == self.test_post_id)
                if found_post and has_user_data:
                    self.log_result("social_features", "Social Feed with User Data", True, 
                                  f"Feed contains {len(data)} posts with user/vehicle data")
                else:
                    self.log_result("social_features", "Social Feed with User Data", False, 
                                  "Post not found in feed or missing user data")
            else:
                self.log_result("social_features", "Social Feed with User Data", False, 
                              "Invalid feed format")
        else:
            self.log_result("social_features", "Social Feed with User Data", False, 
                          "Failed to retrieve social feed")
        
        # Test 3: Like Post
        if self.test_post_id:
            response = self.make_request("POST", f"/posts/{self.test_post_id}/like")
            if response and response.status_code == 200:
                data = response.json()
                if data.get("liked") == True:
                    self.log_result("social_features", "Like Post", True, 
                                  "Post liked successfully")
                else:
                    self.log_result("social_features", "Like Post", False, 
                                  "Like response incorrect")
            else:
                self.log_result("social_features", "Like Post", False, 
                              "Failed to like post")
        
        # Test 4: Unlike Post (toggle)
        if self.test_post_id:
            response = self.make_request("POST", f"/posts/{self.test_post_id}/like")
            if response and response.status_code == 200:
                data = response.json()
                if data.get("liked") == False:
                    self.log_result("social_features", "Unlike Post", True, 
                                  "Post unliked successfully")
                else:
                    self.log_result("social_features", "Unlike Post", False, 
                                  "Unlike response incorrect")
            else:
                self.log_result("social_features", "Unlike Post", False, 
                              "Failed to unlike post")
        
        # Test 5: Get User Posts
        if self.test_user_id:
            response = self.make_request("GET", f"/posts/user/{self.test_user_id}")
            if response and response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    found_post = any(p.get("id") == self.test_post_id for p in data)
                    if found_post:
                        self.log_result("social_features", "User-Specific Posts", True, 
                                      f"Found {len(data)} posts for user")
                    else:
                        self.log_result("social_features", "User-Specific Posts", False, 
                                      "Test post not found in user's posts")
                else:
                    self.log_result("social_features", "User-Specific Posts", False, 
                                  "Invalid user posts format")
            else:
                self.log_result("social_features", "User-Specific Posts", False, 
                              "Failed to retrieve user posts")
        
        # Test 6: Post Count Update
        response = self.make_request("GET", "/auth/me")
        if response and response.status_code == 200:
            data = response.json()
            if data.get("posts_count", 0) > 0:
                self.log_result("social_features", "Post Count Update", True, 
                              f"User post count: {data.get('posts_count')}")
            else:
                self.log_result("social_features", "Post Count Update", False, 
                              "Post count not updated in user profile")
    
    def test_error_handling(self):
        """Test error handling scenarios"""
        print("\n=== TESTING ERROR HANDLING ===")
        
        # Test 1: Registration with existing email
        if self.test_user_id:
            duplicate_data = {
                "username": "newuser123",
                "email": f"test_{str(int(datetime.now().timestamp()))}@crewznation.com",  # Use same email pattern but different
                "password": "password123",
                "full_name": "Duplicate User"
            }
            
            # First register a user
            response = self.make_request("POST", "/auth/register", duplicate_data)
            if response and response.status_code == 200:
                # Now try to register with same email
                response = self.make_request("POST", "/auth/register", duplicate_data, expect_error=True)
                if response and response.status_code == 400:
                    self.log_result("error_handling", "Duplicate Email Registration", True, 
                                  "Correctly rejected duplicate email")
                else:
                    self.log_result("error_handling", "Duplicate Email Registration", False, 
                                  "Should have rejected duplicate email")
        
        # Test 2: Invalid login credentials
        invalid_login = {
            "email": "nonexistent@example.com",
            "password": "wrongpassword"
        }
        
        response = self.make_request("POST", "/auth/login", invalid_login, expect_error=True)
        if response and response.status_code == 401:
            self.log_result("error_handling", "Invalid Login Credentials", True, 
                          "Correctly rejected invalid credentials")
        else:
            self.log_result("error_handling", "Invalid Login Credentials", False, 
                          "Should have rejected invalid credentials")
        
        # Test 3: Access protected route without token
        old_token = self.auth_token
        self.auth_token = None
        
        response = self.make_request("GET", "/auth/me", expect_error=True)
        if response and response.status_code == 403:  # FastAPI returns 403 for missing auth
            self.log_result("error_handling", "Missing Token Access", True, 
                          "Correctly rejected request without token")
        else:
            self.log_result("error_handling", "Missing Token Access", False, 
                          "Should have rejected request without token")
        
        # Restore token
        self.auth_token = old_token
        
        # Test 4: Invalid vehicle data
        invalid_vehicle = {
            "make": "",  # Empty required field
            "model": "Test",
            "year": "invalid_year",  # Invalid type
            "type": "invalid_type"  # Invalid enum value
        }
        
        response = self.make_request("POST", "/vehicles", invalid_vehicle, expect_error=True)
        if response and response.status_code >= 400:
            self.log_result("error_handling", "Invalid Vehicle Data", True, 
                          "Correctly rejected invalid vehicle data")
        else:
            self.log_result("error_handling", "Invalid Vehicle Data", False, 
                          "Should have rejected invalid vehicle data")
        
        # Test 5: Access non-existent vehicle
        fake_vehicle_id = str(uuid.uuid4())
        response = self.make_request("PUT", f"/vehicles/{fake_vehicle_id}", 
                                   {"make": "Test", "model": "Test", "year": 2023, "type": "car"}, 
                                   expect_error=True)
        if response and response.status_code == 404:
            self.log_result("error_handling", "Non-existent Vehicle Access", True, 
                          "Correctly returned 404 for non-existent vehicle")
        else:
            self.log_result("error_handling", "Non-existent Vehicle Access", False, 
                          "Should have returned 404 for non-existent vehicle")
    
    def run_all_tests(self):
        """Run all test suites"""
        print("🚀 Starting CrewZNatioN Backend API Tests")
        print(f"Testing against: {self.base_url}")
        print("=" * 60)
        
        try:
            self.test_authentication()
            self.test_vehicle_management()
            self.test_social_features()
            self.test_error_handling()
        except Exception as e:
            print(f"❌ Critical test error: {e}")
        
        self.print_summary()
    
    def print_summary(self):
        """Print test results summary"""
        print("\n" + "=" * 60)
        print("🏁 TEST RESULTS SUMMARY")
        print("=" * 60)
        
        total_passed = 0
        total_failed = 0
        
        for category, results in self.results.items():
            passed = results["passed"]
            failed = results["failed"]
            total_passed += passed
            total_failed += failed
            
            status = "✅" if failed == 0 else "❌"
            print(f"{status} {category.upper().replace('_', ' ')}: {passed} passed, {failed} failed")
            
            # Print details for failed tests
            if failed > 0:
                for detail in results["details"]:
                    if "❌ FAIL" in detail:
                        print(f"   {detail}")
        
        print("-" * 60)
        overall_status = "✅ ALL TESTS PASSED" if total_failed == 0 else f"❌ {total_failed} TESTS FAILED"
        print(f"OVERALL: {total_passed} passed, {total_failed} failed - {overall_status}")
        
        if total_failed == 0:
            print("🎉 CrewZNatioN Backend API is fully functional!")
        else:
            print("⚠️  Some issues found - check failed tests above")
        
        return total_failed == 0

if __name__ == "__main__":
    tester = CrewZNationAPITester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)