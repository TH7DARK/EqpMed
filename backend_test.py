
import requests
import sys
import time
from datetime import datetime

class MedicalEquipmentSystemTester:
    def __init__(self, base_url="https://ed86aceb-70c6-422a-9008-6483a9ed5119.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.tokens = {}
        self.users = {}
        self.tests_run = 0
        self.tests_passed = 0
        self.equipment_ids = []
        self.ticket_ids = []
        self.maintenance_ids = []

    def run_test(self, name, method, endpoint, expected_status, data=None, auth_user=None, print_response=False):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if auth_user and auth_user in self.tokens:
            headers['Authorization'] = f'Bearer {self.tokens[auth_user]}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                if print_response:
                    print(f"Response: {response.json()}")
                return True, response.json() if response.status_code != 204 else {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"Response: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_login(self, username, password, expected_role=None):
        """Test login and store token"""
        print(f"\n🔐 Logging in as {username}...")
        success, response = self.run_test(
            f"Login as {username}",
            "POST",
            "login",
            200,
            data={"username": username, "password": password}
        )
        
        if success and "access_token" in response:
            self.tokens[username] = response["access_token"]
            self.users[username] = response["user"]
            
            if expected_role and response["user"]["role"] != expected_role:
                print(f"❌ Role mismatch - Expected {expected_role}, got {response['user']['role']}")
                return False
                
            print(f"✅ Successfully logged in as {username} with role {response['user']['role']}")
            return True
        return False

    def test_me_endpoint(self, username):
        """Test the /me endpoint"""
        return self.run_test(
            f"Get current user ({username})",
            "GET",
            "me",
            200,
            auth_user=username
        )

    def test_create_equipment(self, auth_user, equipment_data):
        """Test creating equipment"""
        success, response = self.run_test(
            "Create equipment",
            "POST",
            "equipment",
            200,
            data=equipment_data,
            auth_user=auth_user
        )
        
        if success and "id" in response:
            self.equipment_ids.append(response["id"])
            return True, response["id"]
        return False, None

    def test_get_equipment(self, auth_user):
        """Test getting all equipment"""
        return self.run_test(
            "Get all equipment",
            "GET",
            "equipment",
            200,
            auth_user=auth_user,
            print_response=True
        )

    def test_get_equipment_by_id(self, auth_user, equipment_id):
        """Test getting equipment by ID"""
        return self.run_test(
            f"Get equipment by ID ({equipment_id})",
            "GET",
            f"equipment/{equipment_id}",
            200,
            auth_user=auth_user
        )

    def test_update_equipment(self, auth_user, equipment_id, update_data):
        """Test updating equipment"""
        return self.run_test(
            f"Update equipment ({equipment_id})",
            "PUT",
            f"equipment/{equipment_id}",
            200,
            data=update_data,
            auth_user=auth_user
        )

    def test_delete_equipment(self, auth_user, equipment_id):
        """Test deleting equipment (admin only)"""
        return self.run_test(
            f"Delete equipment ({equipment_id})",
            "DELETE",
            f"equipment/{equipment_id}",
            200,
            auth_user=auth_user
        )

    def test_create_ticket(self, auth_user, ticket_data):
        """Test creating a ticket"""
        success, response = self.run_test(
            "Create ticket",
            "POST",
            "tickets",
            200,
            data=ticket_data,
            auth_user=auth_user
        )
        
        if success and "id" in response:
            self.ticket_ids.append(response["id"])
            return True, response["id"]
        return False, None

    def test_get_tickets(self, auth_user):
        """Test getting all tickets"""
        return self.run_test(
            "Get all tickets",
            "GET",
            "tickets",
            200,
            auth_user=auth_user,
            print_response=True
        )

    def test_get_ticket_by_id(self, auth_user, ticket_id):
        """Test getting ticket by ID"""
        return self.run_test(
            f"Get ticket by ID ({ticket_id})",
            "GET",
            f"tickets/{ticket_id}",
            200,
            auth_user=auth_user
        )

    def test_update_ticket(self, auth_user, ticket_id, update_data):
        """Test updating ticket"""
        return self.run_test(
            f"Update ticket ({ticket_id})",
            "PUT",
            f"tickets/{ticket_id}",
            200,
            data=update_data,
            auth_user=auth_user
        )

    def test_create_maintenance(self, auth_user, maintenance_data):
        """Test creating maintenance record"""
        success, response = self.run_test(
            "Create maintenance record",
            "POST",
            "maintenance",
            200,
            data=maintenance_data,
            auth_user=auth_user
        )
        
        if success and "id" in response:
            self.maintenance_ids.append(response["id"])
            return True, response["id"]
        return False, None

    def test_get_equipment_maintenance(self, auth_user, equipment_id):
        """Test getting maintenance records for equipment"""
        return self.run_test(
            f"Get maintenance records for equipment ({equipment_id})",
            "GET",
            f"maintenance/equipment/{equipment_id}",
            200,
            auth_user=auth_user,
            print_response=True
        )

    def test_get_stats(self, auth_user):
        """Test getting dashboard stats (admin only)"""
        return self.run_test(
            "Get dashboard stats",
            "GET",
            "stats",
            200,
            auth_user=auth_user,
            print_response=True
        )

    def run_all_tests(self):
        """Run all tests in sequence"""
        print("\n🚀 Starting Medical Equipment System API Tests\n")
        
        # Test authentication
        if not self.test_login("admin", "admin123", "admin"):
            print("❌ Admin login failed, stopping tests")
            return False
            
        if not self.test_login("user", "user123", "user"):
            print("❌ User login failed, stopping tests")
            return False
            
        if not self.test_login("tecnico", "tecnico123", "user"):
            print("❌ Technician login failed, stopping tests")
            return False
            
        # Test user info
        self.test_me_endpoint("admin")
        self.test_me_endpoint("user")
        self.test_me_endpoint("tecnico")
        
        # Test equipment management
        equipment_data = {
            "name": "Test Ultrasound",
            "model": "US-2000",
            "manufacturer": "MedTech",
            "serial_number": f"SN-{int(time.time())}",
            "description": "Test equipment created by API test",
            "location": "Test Lab",
            "status": "active",
            "installation_date": datetime.utcnow().isoformat()
        }
        
        success, equipment_id = self.test_create_equipment("admin", equipment_data)
        if not success:
            print("❌ Equipment creation failed, stopping equipment tests")
        else:
            # Test equipment retrieval
            self.test_get_equipment("admin")
            self.test_get_equipment("user")
            self.test_get_equipment_by_id("admin", equipment_id)
            
            # Test equipment update
            update_data = {
                "description": "Updated description",
                "status": "maintenance"
            }
            self.test_update_equipment("admin", equipment_id, update_data)
            
            # Test ticket creation
            ticket_data = {
                "equipment_id": equipment_id,
                "title": "Test Ticket",
                "description": "This is a test ticket",
                "priority": "high"
            }
            
            success, ticket_id = self.test_create_ticket("user", ticket_data)
            if success:
                # Test ticket retrieval
                self.test_get_tickets("admin")  # Admin should see all tickets
                self.test_get_tickets("user")   # User should see only their tickets
                self.test_get_ticket_by_id("admin", ticket_id)
                self.test_get_ticket_by_id("user", ticket_id)
                
                # Test ticket update
                update_data = {
                    "status": "in_progress",
                    "assigned_to": self.users["tecnico"]["id"]
                }
                self.test_update_ticket("admin", ticket_id, update_data)
                
                # Test maintenance record
                maintenance_data = {
                    "equipment_id": equipment_id,
                    "maintenance_type": "preventive",
                    "description": "Regular maintenance check",
                    "next_maintenance_date": (datetime.utcnow().isoformat()),
                    "cost": 150.00,
                    "notes": "Everything looks good"
                }
                
                success, maintenance_id = self.test_create_maintenance("tecnico", maintenance_data)
                if success:
                    self.test_get_equipment_maintenance("admin", equipment_id)
            
            # Test stats (admin only)
            self.test_get_stats("admin")
            
            # Test permission restrictions
            print("\n🔒 Testing permission restrictions...")
            
            # User shouldn't be able to delete equipment
            self.run_test(
                "User trying to delete equipment (should fail)",
                "DELETE",
                f"equipment/{equipment_id}",
                403,
                auth_user="user"
            )
            
            # User shouldn't be able to access stats
            self.run_test(
                "User trying to access stats (should fail)",
                "GET",
                "stats",
                403,
                auth_user="user"
            )
            
            # Finally, test equipment deletion (admin only)
            self.test_delete_equipment("admin", equipment_id)
        
        # Print results
        print(f"\n📊 Tests passed: {self.tests_passed}/{self.tests_run} ({self.tests_passed/self.tests_run*100:.1f}%)")
        return self.tests_passed == self.tests_run

if __name__ == "__main__":
    tester = MedicalEquipmentSystemTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)
