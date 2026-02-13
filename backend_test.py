import requests
import sys
import json
from datetime import datetime

class PokemonAcademyAPITester:
    def __init__(self, base_url="https://pokemon-academy-1.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.admin_token = None
        self.user_data = None
        self.created_news_id = None
        self.test_user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details
        })

    def test_api_root(self):
        """Test API root endpoint"""
        try:
            response = requests.get(f"{self.api_url}/")
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                details += f", Message: {data.get('message', 'No message')}"
            self.log_test("API Root", success, details)
            return success
        except Exception as e:
            self.log_test("API Root", False, str(e))
            return False

    def test_user_registration(self):
        """Test user registration"""
        timestamp = datetime.now().strftime("%H%M%S")
        test_user = {
            "username": f"testuser_{timestamp}",
            "email": f"test_{timestamp}@example.com",
            "password": "TestPassword123!"
        }
        
        try:
            response = requests.post(f"{self.api_url}/auth/register", json=test_user)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                self.token = data.get("access_token")
                self.user_data = data.get("user")
                details = f"User created: {self.user_data.get('username')}"
            else:
                details = f"Status: {response.status_code}, Error: {response.text}"
            
            self.log_test("User Registration", success, details)
            return success
        except Exception as e:
            self.log_test("User Registration", False, str(e))
            return False

    def test_user_login(self):
        """Test user login with registered user"""
        if not self.user_data:
            self.log_test("User Login", False, "No user data available")
            return False
        
        login_data = {
            "email": self.user_data["email"],
            "password": "TestPassword123!"
        }
        
        try:
            response = requests.post(f"{self.api_url}/auth/login", json=login_data)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                self.token = data.get("access_token")  # Update token
                details = f"Login successful for: {data.get('user', {}).get('username')}"
            else:
                details = f"Status: {response.status_code}, Error: {response.text}"
            
            self.log_test("User Login", success, details)
            return success
        except Exception as e:
            self.log_test("User Login", False, str(e))
            return False

    def test_get_user_profile(self):
        """Test getting current user profile"""
        if not self.token:
            self.log_test("Get User Profile", False, "No token available")
            return False
        
        headers = {"Authorization": f"Bearer {self.token}"}
        
        try:
            response = requests.get(f"{self.api_url}/auth/me", headers=headers)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                details = f"Profile retrieved: {data.get('username')}"
            else:
                details = f"Status: {response.status_code}, Error: {response.text}"
            
            self.log_test("Get User Profile", success, details)
            return success
        except Exception as e:
            self.log_test("Get User Profile", False, str(e))
            return False

    def test_get_news(self):
        """Test getting news items"""
        if not self.token:
            self.log_test("Get News", False, "No token available")
            return False
        
        headers = {"Authorization": f"Bearer {self.token}"}
        
        try:
            response = requests.get(f"{self.api_url}/news", headers=headers)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                news_count = len(data)
                details = f"Retrieved {news_count} news items"
                if news_count > 0:
                    questionnaire_news = [n for n in data if n.get('news_type') == 'questionnaire']
                    details += f", {len(questionnaire_news)} questionnaire items"
            else:
                details = f"Status: {response.status_code}, Error: {response.text}"
            
            self.log_test("Get News", success, details)
            return success
        except Exception as e:
            self.log_test("Get News", False, str(e))
            return False

    def test_quiz_submission(self):
        """Test quiz submission with sample answers"""
        if not self.token:
            self.log_test("Quiz Submission", False, "No token available")
            return False
        
        headers = {"Authorization": f"Bearer {self.token}"}
        
        # Sample quiz answers (all 'a' answers for consistency)
        quiz_data = {
            "answers": [
                {"question_number": i, "answer": "a"} for i in range(1, 11)
            ]
        }
        
        try:
            response = requests.post(f"{self.api_url}/quiz/submit", json=quiz_data, headers=headers)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                details = f"Quiz completed: {data.get('profile_name')} ({data.get('profile_type')})"
            else:
                details = f"Status: {response.status_code}, Error: {response.text}"
            
            self.log_test("Quiz Submission", success, details)
            return success
        except Exception as e:
            self.log_test("Quiz Submission", False, str(e))
            return False

    def test_quiz_history(self):
        """Test getting quiz history"""
        if not self.token:
            self.log_test("Quiz History", False, "No token available")
            return False
        
        headers = {"Authorization": f"Bearer {self.token}"}
        
        try:
            response = requests.get(f"{self.api_url}/quiz/history", headers=headers)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                details = f"Retrieved {len(data)} quiz history items"
            else:
                details = f"Status: {response.status_code}, Error: {response.text}"
            
            self.log_test("Quiz History", success, details)
            return success
        except Exception as e:
            self.log_test("Quiz History", False, str(e))
            return False

    def test_invalid_login(self):
        """Test login with invalid credentials"""
        invalid_data = {
            "email": "nonexistent@example.com",
            "password": "wrongpassword"
        }
        
        try:
            response = requests.post(f"{self.api_url}/auth/login", json=invalid_data)
            success = response.status_code == 401  # Should fail with 401
            details = f"Status: {response.status_code} (Expected 401)"
            
            self.log_test("Invalid Login (Security)", success, details)
            return success
        except Exception as e:
            self.log_test("Invalid Login (Security)", False, str(e))
            return False

    def test_unauthorized_access(self):
        """Test accessing protected endpoint without token"""
        try:
            response = requests.get(f"{self.api_url}/news")  # No auth header
            success = response.status_code == 403  # Should fail with 403
            details = f"Status: {response.status_code} (Expected 403)"
            
            self.log_test("Unauthorized Access (Security)", success, details)
            return success
        except Exception as e:
            self.log_test("Unauthorized Access (Security)", False, str(e))
            return False

    def test_admin_login(self):
        """Test admin login with correct credentials"""
        admin_credentials = {
            "email": "aquilareale.mz@gmail.com",
            "password": "Init1234"
        }
        
        try:
            response = requests.post(f"{self.api_url}/admin/login", json=admin_credentials)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                self.admin_token = data.get("access_token")
                is_admin = data.get("is_admin", False)
                details = f"Admin login successful, is_admin: {is_admin}"
            else:
                details = f"Status: {response.status_code}, Error: {response.text}"
            
            self.log_test("Admin Login", success, details)
            return success
        except Exception as e:
            self.log_test("Admin Login", False, str(e))
            return False

    def test_admin_login_invalid(self):
        """Test admin login with invalid credentials"""
        invalid_credentials = {
            "email": "wrong@email.com",
            "password": "wrongpassword"
        }
        
        try:
            response = requests.post(f"{self.api_url}/admin/login", json=invalid_credentials)
            success = response.status_code == 401  # Should fail with 401
            details = f"Status: {response.status_code} (Expected 401)"
            
            self.log_test("Admin Login Invalid (Security)", success, details)
            return success
        except Exception as e:
            self.log_test("Admin Login Invalid (Security)", False, str(e))
            return False

    def test_admin_get_news(self):
        """Test admin getting all news"""
        if not self.admin_token:
            self.log_test("Admin Get News", False, "No admin token available")
            return False
        
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        try:
            response = requests.get(f"{self.api_url}/admin/news", headers=headers)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                news_count = len(data)
                details = f"Retrieved {news_count} news items (admin view)"
            else:
                details = f"Status: {response.status_code}, Error: {response.text}"
            
            self.log_test("Admin Get News", success, details)
            return success
        except Exception as e:
            self.log_test("Admin Get News", False, str(e))
            return False

    def test_admin_create_news(self):
        """Test admin creating news"""
        if not self.admin_token:
            self.log_test("Admin Create News", False, "No admin token available")
            return False
        
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        news_data = {
            "title": "Test News Item",
            "description": "This is a test news item created by admin",
            "news_type": "announcement",
            "size": "normal"
        }
        
        try:
            response = requests.post(f"{self.api_url}/admin/news", json=news_data, headers=headers)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                self.created_news_id = data.get("id")
                details = f"News created with ID: {self.created_news_id}"
            else:
                details = f"Status: {response.status_code}, Error: {response.text}"
            
            self.log_test("Admin Create News", success, details)
            return success
        except Exception as e:
            self.log_test("Admin Create News", False, str(e))
            return False

    def test_admin_update_news(self):
        """Test admin updating news"""
        if not self.admin_token or not self.created_news_id:
            self.log_test("Admin Update News", False, "No admin token or news ID available")
            return False
        
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        updated_data = {
            "title": "Updated Test News Item",
            "description": "This news item has been updated by admin",
            "news_type": "event",
            "size": "large"
        }
        
        try:
            response = requests.put(f"{self.api_url}/admin/news/{self.created_news_id}", json=updated_data, headers=headers)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                details = f"News updated: {data.get('title')}"
            else:
                details = f"Status: {response.status_code}, Error: {response.text}"
            
            self.log_test("Admin Update News", success, details)
            return success
        except Exception as e:
            self.log_test("Admin Update News", False, str(e))
            return False

    def test_admin_delete_news(self):
        """Test admin deleting news"""
        if not self.admin_token or not self.created_news_id:
            self.log_test("Admin Delete News", False, "No admin token or news ID available")
            return False
        
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        try:
            response = requests.delete(f"{self.api_url}/admin/news/{self.created_news_id}", headers=headers)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                details = f"News deleted: {data.get('message')}"
            else:
                details = f"Status: {response.status_code}, Error: {response.text}"
            
            self.log_test("Admin Delete News", success, details)
            return success
        except Exception as e:
            self.log_test("Admin Delete News", False, str(e))
            return False

    def test_non_admin_access_admin_endpoints(self):
        """Test regular user cannot access admin endpoints"""
        if not self.token:
            self.log_test("Non-Admin Access Block", False, "No user token available")
            return False
        
        headers = {"Authorization": f"Bearer {self.token}"}
        
        try:
            response = requests.get(f"{self.api_url}/admin/news", headers=headers)
            success = response.status_code == 403  # Should fail with 403
            details = f"Status: {response.status_code} (Expected 403)"
            
            self.log_test("Non-Admin Access Block (Security)", success, details)
            return success
        except Exception as e:
            self.log_test("Non-Admin Access Block (Security)", False, str(e))
            return False

    def test_news_detail(self):
        """Test getting news detail by ID"""
        if not self.token:
            self.log_test("News Detail", False, "No token available")
            return False
        
        headers = {"Authorization": f"Bearer {self.token}"}
        
        # First get news list to get a news ID
        try:
            response = requests.get(f"{self.api_url}/news", headers=headers)
            if response.status_code != 200:
                self.log_test("News Detail", False, "Failed to get news list")
                return False
            
            news_list = response.json()
            if not news_list:
                self.log_test("News Detail", False, "No news available to test")
                return False
            
            news_id = news_list[0]["id"]
            
            # Test news detail endpoint
            response = requests.get(f"{self.api_url}/news/{news_id}", headers=headers)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                success = data.get("id") == news_id
                details = f"Retrieved news: {data.get('title', 'No title')}"
            else:
                details = f"Status: {response.status_code}, Error: {response.text}"
            
            self.log_test("News Detail", success, details)
            return success
        except Exception as e:
            self.log_test("News Detail", False, str(e))
            return False

    def test_get_my_pokemon(self):
        """Test getting user's assigned Pokemon"""
        if not self.token:
            self.log_test("Get My Pokemon", False, "No token available")
            return False
        
        headers = {"Authorization": f"Bearer {self.token}"}
        
        try:
            response = requests.get(f"{self.api_url}/pokemon/my", headers=headers)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                details = f"Retrieved {len(data)} Pokemon"
            else:
                details = f"Status: {response.status_code}, Error: {response.text}"
            
            self.log_test("Get My Pokemon", success, details)
            return success
        except Exception as e:
            self.log_test("Get My Pokemon", False, str(e))
            return False

    def test_admin_get_users(self):
        """Test admin getting all users"""
        if not self.admin_token:
            self.log_test("Admin Get Users", False, "No admin token available")
            return False
        
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        try:
            response = requests.get(f"{self.api_url}/admin/users", headers=headers)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                user_count = len(data)
                details = f"Retrieved {user_count} users"
                # Store test user ID for Pokemon tests
                if self.user_data and user_count > 0:
                    for user in data:
                        if user.get("email") == self.user_data.get("email"):
                            self.test_user_id = user.get("id")
                            break
            else:
                details = f"Status: {response.status_code}, Error: {response.text}"
            
            self.log_test("Admin Get Users", success, details)
            return success
        except Exception as e:
            self.log_test("Admin Get Users", False, str(e))
            return False

    def test_admin_assign_pokemon(self):
        """Test admin assigning Pokemon to user"""
        if not self.admin_token or not self.test_user_id:
            self.log_test("Admin Assign Pokemon", False, "No admin token or test user ID available")
            return False
        
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        pokemon_data = {
            "pokemon_id": 25,  # Pikachu
            "pokemon_name": "pikachu"
        }
        
        try:
            response = requests.post(f"{self.api_url}/admin/users/{self.test_user_id}/pokemon", 
                                   json=pokemon_data, headers=headers)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                details = f"Assigned {data.get('pokemon_name')} to user"
            else:
                details = f"Status: {response.status_code}, Error: {response.text}"
            
            self.log_test("Admin Assign Pokemon", success, details)
            return success
        except Exception as e:
            self.log_test("Admin Assign Pokemon", False, str(e))
            return False

    def test_admin_get_user_pokemon(self):
        """Test admin getting user's Pokemon"""
        if not self.admin_token or not self.test_user_id:
            self.log_test("Admin Get User Pokemon", False, "No admin token or test user ID available")
            return False
        
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        try:
            response = requests.get(f"{self.api_url}/admin/users/{self.test_user_id}/pokemon", headers=headers)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                pokemon_count = len(data)
                details = f"User has {pokemon_count} Pokemon assigned"
                if pokemon_count > 0:
                    details += f", including {data[0].get('pokemon_name')}"
            else:
                details = f"Status: {response.status_code}, Error: {response.text}"
            
            self.log_test("Admin Get User Pokemon", success, details)
            return success
        except Exception as e:
            self.log_test("Admin Get User Pokemon", False, str(e))
            return False

    def test_admin_remove_pokemon(self):
        """Test admin removing Pokemon from user"""
        if not self.admin_token or not self.test_user_id:
            self.log_test("Admin Remove Pokemon", False, "No admin token or test user ID available")
            return False
        
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        try:
            response = requests.delete(f"{self.api_url}/admin/users/{self.test_user_id}/pokemon/25", headers=headers)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                details = f"Pokemon removed: {data.get('message')}"
            else:
                details = f"Status: {response.status_code}, Error: {response.text}"
            
            self.log_test("Admin Remove Pokemon", success, details)
            return success
        except Exception as e:
            self.log_test("Admin Remove Pokemon", False, str(e))
            return False

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting Pokémon Academy API Tests")
        print(f"🎯 Testing against: {self.base_url}")
        print("=" * 50)
        
        # Basic connectivity
        if not self.test_api_root():
            print("❌ API not accessible, stopping tests")
            return False
        
        # Authentication flow
        self.test_user_registration()
        self.test_user_login()
        self.test_get_user_profile()
        
        # Protected endpoints
        self.test_get_news()
        self.test_news_detail()
        self.test_get_my_pokemon()
        self.test_quiz_submission()
        self.test_quiz_history()
        
        # Admin functionality tests
        print("\n🔐 Testing Admin Functionality...")
        self.test_admin_login()
        self.test_admin_login_invalid()
        self.test_admin_get_news()
        self.test_admin_create_news()
        self.test_admin_update_news()
        self.test_admin_delete_news()
        
        # Pokemon system tests
        print("\n🎮 Testing Pokemon System...")
        self.test_admin_get_users()
        self.test_admin_assign_pokemon()
        self.test_admin_get_user_pokemon()
        self.test_admin_remove_pokemon()
        
        # Security tests
        print("\n🛡️ Testing Security...")
        self.test_invalid_login()
        self.test_unauthorized_access()
        self.test_non_admin_access_admin_endpoints()
        
        # Results
        print("=" * 50)
        print(f"📊 Tests completed: {self.tests_passed}/{self.tests_run} passed")
        success_rate = (self.tests_passed / self.tests_run) * 100 if self.tests_run > 0 else 0
        print(f"📈 Success rate: {success_rate:.1f}%")
        
        if success_rate < 80:
            print("⚠️  Warning: Low success rate detected")
            return False
        
        return success_rate >= 80

def main():
    tester = PokemonAcademyAPITester()
    success = tester.run_all_tests()
    
    # Save detailed results
    results = {
        "timestamp": datetime.now().isoformat(),
        "base_url": tester.base_url,
        "total_tests": tester.tests_run,
        "passed_tests": tester.tests_passed,
        "success_rate": (tester.tests_passed / tester.tests_run) * 100 if tester.tests_run > 0 else 0,
        "test_details": tester.test_results
    }
    
    with open("/app/backend_test_results.json", "w") as f:
        json.dump(results, f, indent=2)
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())