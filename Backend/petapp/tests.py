from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import AdoptionApplication, Pet, PetImage, PetWishlist


User = get_user_model()


class PetApiFlowTests(APITestCase):
    def setUp(self):
        self.password = "SafePass123!"
        self.rehomer = User.objects.create_user(
            username="rehomer1",
            email="rehomer@example.com",
            password=self.password,
            role="rehomer",
        )
        self.adopter = User.objects.create_user(
            username="adopter1",
            email="adopter@example.com",
            password=self.password,
            role="adopter",
        )
        self.other_adopter = User.objects.create_user(
            username="adopter2",
            email="adopter2@example.com",
            password=self.password,
            role="adopter",
        )
        self.pet = Pet.objects.create(
            name="Milo",
            species=Pet.DOG,
            breed="Beagle",
            age="2 years",
            city="Nairobi",
            state="Nairobi County",
            country="Kenya",
            description="Friendly dog",
            owner=self.rehomer,
        )
        self.other_pet = Pet.objects.create(
            name="Luna",
            species=Pet.CAT,
            owner=self.adopter,
        )

    def authenticate(self, username, password):
        response = self.client.post(
            reverse("token-obtain-pair"),
            {"username": username, "password": password},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {response.data['access']}")
        return response.data

    def test_user_registration(self):
        payload = {
            "username": "newuser",
            "email": "newuser@example.com",
            "password": self.password,
            "first_name": "New",
            "last_name": "User",
            "role": "adopter",
            "phone_number": "12345",
            "bio": "Excited to adopt.",
        }

        response = self.client.post(reverse("auth-register"), payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertTrue(User.objects.filter(username="newuser").exists())

    def test_jwt_login(self):
        response = self.client.post(
            reverse("token-obtain-pair"),
            {"username": self.rehomer.username, "password": self.password},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)

    def test_current_user_profile(self):
        self.authenticate(self.rehomer.username, self.password)

        response = self.client.get(reverse("auth-profile"))

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertEqual(response.data["username"], self.rehomer.username)
        self.assertEqual(response.data["role"], self.rehomer.role)

    def test_list_pets(self):
        response = self.client.get(reverse("pet-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        returned_ids = {item["id"] for item in response.data}
        self.assertEqual(len(response.data), 2)
        self.assertIn(self.pet.id, returned_ids)
        self.assertIn(self.other_pet.id, returned_ids)

    def test_create_pet(self):
        self.authenticate(self.rehomer.username, self.password)
        payload = {
            "name": "Luna",
            "species": "cat",
            "breed": "Tabby",
            "age": "1 year",
            "gender": "female",
            "location": "Westlands",
            "city": "Nairobi",
            "state": "Nairobi County",
            "country": "Kenya",
            "description": "Calm and playful",
            "personality_traits": ["calm", "playful"],
            "is_vaccinated": True,
            "is_dewormed": True,
            "is_neutered": True,
            "adoption_fee": "10.00",
        }

        response = self.client.post(reverse("pet-create"), payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertEqual(response.data["owner"]["id"], self.rehomer.id)
        self.assertTrue(Pet.objects.filter(name="Luna", owner=self.rehomer).exists())

    def test_adopter_cannot_create_pet(self):
        self.authenticate(self.adopter.username, self.password)
        payload = {
            "name": "Blocked",
            "species": "dog",
        }

        response = self.client.post(reverse("pet-create"), payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN, response.data)

    def test_create_pet_with_image_url(self):
        self.authenticate(self.rehomer.username, self.password)
        payload = {
            "name": "Ruby",
            "species": "cat",
            "breed": "Tabby",
            "age": "1 year",
            "gender": "female",
            "location": "Westlands",
            "city": "Nairobi",
            "state": "Nairobi County",
            "country": "Kenya",
            "description": "Calm and playful",
            "personality_traits": ["calm", "playful"],
            "adoption_fee": "10.00",
            "image_url": "https://example.com/pets/ruby.jpg",
        }

        response = self.client.post(reverse("pet-create"), payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        pet = Pet.objects.get(name="Ruby", owner=self.rehomer)
        self.assertTrue(
            PetImage.objects.filter(
                pet=pet,
                image_url="https://example.com/pets/ruby.jpg",
                is_main=True,
            ).exists()
        )

    def test_retrieve_pet_detail(self):
        response = self.client.get(reverse("pet-detail", args=[self.pet.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertEqual(response.data["name"], self.pet.name)

    def test_owner_can_update_pet_image_url(self):
        self.authenticate(self.rehomer.username, self.password)

        response = self.client.patch(
            reverse("pet-detail", args=[self.pet.id]),
            {"image_url": "https://example.com/pets/milo-updated.jpg"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertTrue(
            PetImage.objects.filter(
                pet=self.pet,
                image_url="https://example.com/pets/milo-updated.jpg",
                is_main=True,
            ).exists()
        )

    def test_list_my_pets(self):
        self.authenticate(self.rehomer.username, self.password)

        response = self.client.get(reverse("pet-my-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["id"], self.pet.id)

    def test_create_adoption_application(self):
        self.authenticate(self.adopter.username, self.password)
        payload = {
            "pet_id": self.pet.id,
            "message": "I would love to adopt Milo.",
            "housing_type": "house",
            "has_other_pets": True,
            "has_children": False,
            "pet_experience": "Had dogs growing up.",
            "can_afford_vet_care": True,
            "preferred_visit_date": "2026-05-10",
        }

        response = self.client.post(reverse("application-create"), payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertEqual(response.data["applicant"]["id"], self.adopter.id)
        self.assertEqual(response.data["pet"]["id"], self.pet.id)
        self.assertTrue(
            AdoptionApplication.objects.filter(applicant=self.adopter, pet=self.pet).exists()
        )

    def test_rehomer_cannot_create_adoption_application(self):
        self.authenticate(self.rehomer.username, self.password)

        response = self.client.post(
            reverse("application-create"),
            {"pet_id": self.pet.id, "message": "I want this pet."},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN, response.data)

    def test_duplicate_active_application_is_rejected(self):
        AdoptionApplication.objects.create(
            pet=self.pet,
            applicant=self.adopter,
            message="Already applied.",
            status=AdoptionApplication.PENDING,
        )
        self.authenticate(self.adopter.username, self.password)

        response = self.client.post(
            reverse("application-create"),
            {"pet_id": self.pet.id, "message": "Applying again."},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST, response.data)

    def test_list_my_applications(self):
        application = AdoptionApplication.objects.create(
            pet=self.pet,
            applicant=self.adopter,
            message="Interested.",
        )
        self.authenticate(self.adopter.username, self.password)

        response = self.client.get(reverse("application-my-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["id"], application.id)

    def test_list_received_applications_for_my_pets(self):
        application = AdoptionApplication.objects.create(
            pet=self.pet,
            applicant=self.adopter,
            message="Interested.",
        )
        self.authenticate(self.rehomer.username, self.password)

        response = self.client.get(reverse("application-received-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["id"], application.id)

    def test_approve_application(self):
        application = AdoptionApplication.objects.create(
            pet=self.pet,
            applicant=self.adopter,
            message="Interested.",
        )
        other_application = AdoptionApplication.objects.create(
            pet=self.pet,
            applicant=self.other_adopter,
            message="Also interested.",
        )
        self.authenticate(self.rehomer.username, self.password)

        response = self.client.post(reverse("application-approve", args=[application.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        application.refresh_from_db()
        other_application.refresh_from_db()
        self.pet.refresh_from_db()
        self.assertEqual(application.status, AdoptionApplication.APPROVED)
        self.assertEqual(other_application.status, AdoptionApplication.REJECTED)
        self.assertEqual(self.pet.status, Pet.ADOPTED)

    def test_reject_application(self):
        application = AdoptionApplication.objects.create(
            pet=self.pet,
            applicant=self.adopter,
            message="Interested.",
        )
        self.authenticate(self.rehomer.username, self.password)

        response = self.client.post(reverse("application-reject", args=[application.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        application.refresh_from_db()
        self.assertEqual(application.status, AdoptionApplication.REJECTED)

    def test_authenticated_user_can_save_pet_to_wishlist(self):
        self.authenticate(self.adopter.username, self.password)

        response = self.client.post(
            reverse("wishlist-list-create"),
            {"pet_id": self.pet.id},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertTrue(PetWishlist.objects.filter(user=self.adopter, pet=self.pet).exists())

    def test_authenticated_user_can_list_own_wishlist(self):
        wishlist_item = PetWishlist.objects.create(user=self.adopter, pet=self.pet)
        PetWishlist.objects.create(user=self.other_adopter, pet=self.pet)
        self.authenticate(self.adopter.username, self.password)

        response = self.client.get(reverse("wishlist-list-create"))

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["id"], wishlist_item.id)
        self.assertEqual(response.data[0]["pet"]["id"], self.pet.id)

    def test_duplicate_save_does_not_create_duplicate_wishlist_records(self):
        self.authenticate(self.adopter.username, self.password)
        payload = {"pet_id": self.pet.id}

        first_response = self.client.post(reverse("wishlist-list-create"), payload, format="json")
        second_response = self.client.post(reverse("wishlist-list-create"), payload, format="json")

        self.assertEqual(first_response.status_code, status.HTTP_201_CREATED, first_response.data)
        self.assertEqual(second_response.status_code, status.HTTP_200_OK, second_response.data)
        self.assertEqual(
            PetWishlist.objects.filter(user=self.adopter, pet=self.pet).count(),
            1,
        )

    def test_user_cannot_delete_another_users_wishlist_item(self):
        wishlist_item = PetWishlist.objects.create(user=self.other_adopter, pet=self.pet)
        self.authenticate(self.adopter.username, self.password)

        response = self.client.delete(reverse("wishlist-delete", args=[wishlist_item.id]))

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND, response.data)
        self.assertTrue(PetWishlist.objects.filter(pk=wishlist_item.id).exists())
