"""
Test suite for Pokemon Nickname and Level functionality
Tests the following endpoints:
- GET /api/pokemon/my - List user's Pokemon
- GET /api/pokemon/my/{pokemon_id} - Get specific Pokemon details
- PUT /api/pokemon/my/{pokemon_id} - Update nickname/level
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestPokemonNicknameLevel:
    """Tests for Pokemon nickname and level management"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test user and admin tokens"""
        # Create a unique test user
        import uuid
        unique_id = str(uuid.uuid4())[:8]
        self.test_user = {
            "username": f"TEST_NickLevel_{unique_id}",
            "email": f"test_nicklevel_{unique_id}@test.com",
            "password": "Test1234"
        }
        
        # Register user
        response = requests.post(f"{BASE_URL}/api/auth/register", json=self.test_user)
        if response.status_code == 200:
            data = response.json()
            self.user_token = data["access_token"]
            self.user_id = data["user"]["id"]
        else:
            pytest.skip("Could not create test user")
        
        # Get admin token
        admin_response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "email": "aquilareale.mz@gmail.com",
            "password": "Init1234"
        })
        if admin_response.status_code == 200:
            self.admin_token = admin_response.json()["access_token"]
        else:
            pytest.skip("Could not get admin token")
        
        # Assign a Pokemon to the test user (Pikachu ID 25)
        assign_response = requests.post(
            f"{BASE_URL}/api/admin/users/{self.user_id}/pokemon",
            json={"pokemon_id": 25, "pokemon_name": "pikachu"},
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        if assign_response.status_code != 200:
            pytest.skip("Could not assign Pokemon to test user")
        
        yield
        
        # Cleanup: Remove the Pokemon from user
        requests.delete(
            f"{BASE_URL}/api/admin/users/{self.user_id}/pokemon/25",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
    
    def test_get_my_pokemon_list(self):
        """Test GET /api/pokemon/my - should return user's Pokemon list"""
        response = requests.get(
            f"{BASE_URL}/api/pokemon/my",
            headers={"Authorization": f"Bearer {self.user_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        assert len(data) >= 1, "User should have at least 1 Pokemon"
        
        # Verify Pokemon structure
        pokemon = data[0]
        assert "pokemon_id" in pokemon, "Pokemon should have pokemon_id"
        assert "pokemon_name" in pokemon, "Pokemon should have pokemon_name"
        assert pokemon["pokemon_id"] == 25, "Pokemon ID should be 25 (Pikachu)"
        print(f"✓ GET /api/pokemon/my returns {len(data)} Pokemon(s)")
    
    def test_get_pokemon_detail(self):
        """Test GET /api/pokemon/my/{pokemon_id} - should return Pokemon details"""
        response = requests.get(
            f"{BASE_URL}/api/pokemon/my/25",
            headers={"Authorization": f"Bearer {self.user_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "pokemon_id" in data, "Response should have pokemon_id"
        assert data["pokemon_id"] == 25, "Pokemon ID should be 25"
        print(f"✓ GET /api/pokemon/my/25 returns Pokemon details")
    
    def test_update_nickname_success(self):
        """Test PUT /api/pokemon/my/{pokemon_id} - update nickname"""
        # Update nickname
        response = requests.put(
            f"{BASE_URL}/api/pokemon/my/25",
            json={"nickname": "Sparky"},
            headers={"Authorization": f"Bearer {self.user_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("nickname") == "Sparky", f"Nickname should be 'Sparky', got {data.get('nickname')}"
        
        # Verify persistence with GET
        get_response = requests.get(
            f"{BASE_URL}/api/pokemon/my/25",
            headers={"Authorization": f"Bearer {self.user_token}"}
        )
        get_data = get_response.json()
        assert get_data.get("nickname") == "Sparky", "Nickname should persist after GET"
        print(f"✓ Nickname update and persistence verified")
    
    def test_update_level_valid_values(self):
        """Test PUT /api/pokemon/my/{pokemon_id} - update level with valid values"""
        # Test level 1 (minimum)
        response = requests.put(
            f"{BASE_URL}/api/pokemon/my/25",
            json={"level": 1},
            headers={"Authorization": f"Bearer {self.user_token}"}
        )
        assert response.status_code == 200, f"Level 1 failed: {response.text}"
        assert response.json().get("level") == 1, "Level should be 1"
        
        # Test level 50 (middle)
        response = requests.put(
            f"{BASE_URL}/api/pokemon/my/25",
            json={"level": 50},
            headers={"Authorization": f"Bearer {self.user_token}"}
        )
        assert response.status_code == 200, f"Level 50 failed: {response.text}"
        assert response.json().get("level") == 50, "Level should be 50"
        
        # Test level 100 (maximum)
        response = requests.put(
            f"{BASE_URL}/api/pokemon/my/25",
            json={"level": 100},
            headers={"Authorization": f"Bearer {self.user_token}"}
        )
        assert response.status_code == 200, f"Level 100 failed: {response.text}"
        assert response.json().get("level") == 100, "Level should be 100"
        
        # Verify persistence
        get_response = requests.get(
            f"{BASE_URL}/api/pokemon/my/25",
            headers={"Authorization": f"Bearer {self.user_token}"}
        )
        assert get_response.json().get("level") == 100, "Level should persist as 100"
        print(f"✓ Level update with valid values (1, 50, 100) verified")
    
    def test_update_both_nickname_and_level(self):
        """Test PUT /api/pokemon/my/{pokemon_id} - update both fields at once"""
        response = requests.put(
            f"{BASE_URL}/api/pokemon/my/25",
            json={"nickname": "Thunder", "level": 75},
            headers={"Authorization": f"Bearer {self.user_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("nickname") == "Thunder", "Nickname should be 'Thunder'"
        assert data.get("level") == 75, "Level should be 75"
        
        # Verify both values persist
        get_response = requests.get(
            f"{BASE_URL}/api/pokemon/my/25",
            headers={"Authorization": f"Bearer {self.user_token}"}
        )
        get_data = get_response.json()
        assert get_data.get("nickname") == "Thunder", "Nickname should persist"
        assert get_data.get("level") == 75, "Level should persist"
        print(f"✓ Both nickname and level update verified")
    
    def test_clear_nickname(self):
        """Test clearing nickname by setting it to empty string or null"""
        # First set a nickname
        requests.put(
            f"{BASE_URL}/api/pokemon/my/25",
            json={"nickname": "TempName"},
            headers={"Authorization": f"Bearer {self.user_token}"}
        )
        
        # Clear it with empty string
        response = requests.put(
            f"{BASE_URL}/api/pokemon/my/25",
            json={"nickname": ""},
            headers={"Authorization": f"Bearer {self.user_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        # Empty string or null should both be acceptable
        assert data.get("nickname") in ["", None], f"Nickname should be empty, got {data.get('nickname')}"
        print(f"✓ Clear nickname verified")
    
    def test_update_nonexistent_pokemon_returns_404(self):
        """Test updating a Pokemon the user doesn't own returns 404"""
        response = requests.put(
            f"{BASE_URL}/api/pokemon/my/999",  # Non-existent Pokemon ID
            json={"nickname": "Test"},
            headers={"Authorization": f"Bearer {self.user_token}"}
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"✓ Non-existent Pokemon returns 404")
    
    def test_update_without_auth_returns_error(self):
        """Test updating without authentication returns error"""
        response = requests.put(
            f"{BASE_URL}/api/pokemon/my/25",
            json={"nickname": "Test"}
        )
        
        # Should return 401 or 403
        assert response.status_code in [401, 403, 422], f"Expected auth error, got {response.status_code}"
        print(f"✓ Unauthenticated request properly rejected")
    
    def test_empty_update_returns_error(self):
        """Test PUT with no fields returns error (400)"""
        response = requests.put(
            f"{BASE_URL}/api/pokemon/my/25",
            json={},
            headers={"Authorization": f"Bearer {self.user_token}"}
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print(f"✓ Empty update properly rejected with 400")


class TestAdminPokemonAssignment:
    """Tests for admin Pokemon assignment functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup admin token"""
        admin_response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "email": "aquilareale.mz@gmail.com",
            "password": "Init1234"
        })
        if admin_response.status_code == 200:
            self.admin_token = admin_response.json()["access_token"]
        else:
            pytest.skip("Could not get admin token")
        
        # Create test user
        import uuid
        unique_id = str(uuid.uuid4())[:8]
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "username": f"TEST_Admin_{unique_id}",
            "email": f"test_admin_{unique_id}@test.com",
            "password": "Test1234"
        })
        if response.status_code == 200:
            self.user_id = response.json()["user"]["id"]
        else:
            pytest.skip("Could not create test user")
        
        yield
        
        # Cleanup: Try to remove any assigned Pokemon
        requests.delete(
            f"{BASE_URL}/api/admin/users/{self.user_id}/pokemon/1",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
    
    def test_admin_assign_pokemon(self):
        """Test admin can assign Pokemon to user"""
        response = requests.post(
            f"{BASE_URL}/api/admin/users/{self.user_id}/pokemon",
            json={"pokemon_id": 1, "pokemon_name": "bulbasaur"},
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("pokemon_id") == 1, "Pokemon ID should be 1"
        assert data.get("pokemon_name") == "bulbasaur", "Pokemon name should be bulbasaur"
        assert data.get("user_id") == self.user_id, "User ID should match"
        print(f"✓ Admin Pokemon assignment verified")
    
    def test_admin_get_user_pokemon(self):
        """Test admin can view user's Pokemon list"""
        # First assign a Pokemon
        requests.post(
            f"{BASE_URL}/api/admin/users/{self.user_id}/pokemon",
            json={"pokemon_id": 1, "pokemon_name": "bulbasaur"},
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        
        # Get user's Pokemon
        response = requests.get(
            f"{BASE_URL}/api/admin/users/{self.user_id}/pokemon",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        assert len(data) >= 1, "User should have at least 1 Pokemon"
        print(f"✓ Admin can view user's Pokemon list")


# Run tests if executed directly
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
