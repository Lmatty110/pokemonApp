import requests
import sys
import json
from datetime import datetime

class PokemonAcademyAPITester:
    def __init__(self, base_url="https://trainer-test.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.admin_token = None
        self.user_data = None
        self.created_news_id = None
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
        self.test_quiz_submission()
        self.test_quiz_history()
        
        # Security tests
        self.test_invalid_login()
        self.test_unauthorized_access()
        
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