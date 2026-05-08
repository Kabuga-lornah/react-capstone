from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase
from datetime import timedelta

from .models import AdoptionApplication, Conversation, Notification, Pet, PetImage, PetWishlist


User = get_user_model()


class PetApiFlowTests(APITestCase):
    def setUp(self):
        self.password = "SafePass123!"
        self.rehomer = User.objects.create_user(
            username="rehomer1",
            email="rehomer@example.com",
            password=self.password,
            role="rehomer",
            rehomer_verification_status=User.VERIFIED,
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
            energy_level=Pet.HIGH,
            care_level=Pet.BEGINNER,
            space_needed=Pet.MEDIUM,
            good_with_children=Pet.YES,
            good_with_other_pets=Pet.YES,
            grooming_needs=Pet.LOW,
            noise_level=Pet.MEDIUM,
            apartment_friendly=Pet.YES,
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
            "email": "newuser@example.com",
            "password": self.password,
            "first_name": "New",
            "last_name": "User",
            "role": "adopter",
            "phone_number": "12345",
        }

        response = self.client.post(reverse("auth-register"), payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertTrue(User.objects.filter(username="newuser@example.com").exists())

    def test_registration_requires_phone_and_split_name_fields(self):
        payload = {
            "email": "missingfields@example.com",
            "password": self.password,
            "first_name": "",
            "last_name": "",
            "role": "adopter",
            "phone_number": "",
        }

        response = self.client.post(reverse("auth-register"), payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST, response.data)
        self.assertIn("first_name", response.data)
        self.assertIn("last_name", response.data)
        self.assertIn("phone_number", response.data)

    def test_rehomer_can_submit_verification_profile(self):
        pending_rehomer = User.objects.create_user(
            username="pendingrehomer",
            email="pending@example.com",
            password=self.password,
            role="rehomer",
        )
        self.authenticate(pending_rehomer.username, self.password)

        response = self.client.post(
            reverse("rehomer-verification-submit"),
            {
                "phone_number": "+254700000000",
                "profile_photo_url": "https://example.com/profile.jpg",
                "id_front_url": "https://example.com/id-front.jpg",
                "id_back_url": "https://example.com/id-back.jpg",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        pending_rehomer.refresh_from_db()
        self.assertEqual(pending_rehomer.rehomer_verification_status, User.PENDING)
        self.assertEqual(pending_rehomer.phone_number, "+254700000000")
        self.assertTrue(pending_rehomer.rehomer_verification_submitted_at is not None)

    def test_adopter_cannot_submit_rehomer_verification(self):
        self.authenticate(self.adopter.username, self.password)

        response = self.client.post(
            reverse("rehomer-verification-submit"),
            {
                "phone_number": "+254700000000",
                "id_front_url": "https://example.com/id-front.jpg",
                "id_back_url": "https://example.com/id-back.jpg",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN, response.data)

    def test_verification_submit_requires_id_front_and_back(self):
        pending_rehomer = User.objects.create_user(
            username="pendingrehomer2",
            email="pending2@example.com",
            password=self.password,
            role="rehomer",
        )
        self.authenticate(pending_rehomer.username, self.password)

        response = self.client.post(
            reverse("rehomer-verification-submit"),
            {
                "phone_number": "+254700000000",
                "id_front_url": "https://example.com/id-front.jpg",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST, response.data)
        self.assertIn("id_back_url", response.data)

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
        self.assertEqual(response.data["rehomer_verification_status"], User.VERIFIED)
        self.assertIn("is_online", response.data)
        self.assertIn("activity_status", response.data)

    def test_heartbeat_updates_last_seen_and_online_status(self):
        self.authenticate(self.rehomer.username, self.password)

        response = self.client.patch(reverse("auth-heartbeat"), {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.rehomer.refresh_from_db()
        self.assertIsNotNone(self.rehomer.last_seen)
        self.assertTrue(response.data["is_online"])
        self.assertEqual(response.data["activity_status"], "online")

    def test_user_serializer_reports_recently_active(self):
        self.rehomer.last_seen = timezone.now() - timedelta(minutes=6)
        self.rehomer.save(update_fields=["last_seen"])

        response = self.client.get(reverse("pet-detail", args=[self.pet.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertFalse(response.data["owner"]["is_online"])
        self.assertEqual(response.data["owner"]["activity_status"], "recently_active")

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
            "energy_level": "medium",
            "care_level": "beginner",
            "space_needed": "small",
            "good_with_children": "yes",
            "good_with_other_pets": "yes",
            "grooming_needs": "medium",
            "noise_level": "low",
            "apartment_friendly": "yes",
            "is_vaccinated": True,
            "is_dewormed": True,
            "is_neutered": True,
            "adoption_fee": "10.00",
        }

        response = self.client.post(reverse("pet-create"), payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertEqual(response.data["owner"]["id"], self.rehomer.id)
        self.assertEqual(response.data["energy_level"], "medium")
        self.assertEqual(response.data["care_level"], "beginner")
        self.assertTrue(Pet.objects.filter(name="Luna", owner=self.rehomer).exists())

    def test_adopter_cannot_create_pet(self):
        self.authenticate(self.adopter.username, self.password)
        payload = {
            "name": "Blocked",
            "species": "dog",
        }

        response = self.client.post(reverse("pet-create"), payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN, response.data)

    def test_adopter_can_start_conversation_for_pet(self):
        self.authenticate(self.adopter.username, self.password)

        response = self.client.post(
            reverse("conversation-list-create"),
            {"pet_id": self.pet.id},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertTrue(
            Conversation.objects.filter(
                pet=self.pet,
                adopter=self.adopter,
                rehomer=self.rehomer,
            ).exists()
        )
        self.assertEqual(response.data["other_participant"]["id"], self.rehomer.id)

    def test_conversation_is_reused_for_same_pet_and_adopter(self):
        Conversation.objects.create(
            pet=self.pet,
            adopter=self.adopter,
            rehomer=self.rehomer,
        )
        self.authenticate(self.adopter.username, self.password)

        response = self.client.post(
            reverse("conversation-list-create"),
            {"pet_id": self.pet.id},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertFalse(response.data["created"])
        self.assertEqual(Conversation.objects.count(), 1)

    def test_conversation_detail_returns_messages_and_marks_unread_as_read(self):
        conversation = Conversation.objects.create(
            pet=self.pet,
            adopter=self.adopter,
            rehomer=self.rehomer,
        )
        message = conversation.messages.create(
            sender=self.rehomer,
            body="Hi, Milo eats twice a day.",
        )

        self.authenticate(self.adopter.username, self.password)
        response = self.client.get(reverse("conversation-detail", args=[conversation.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertEqual(len(response.data["messages"]), 1)
        self.assertEqual(response.data["messages"][0]["body"], "Hi, Milo eats twice a day.")
        message.refresh_from_db()
        self.assertIsNotNone(message.read_at)

    def test_user_in_conversation_can_send_message(self):
        conversation = Conversation.objects.create(
            pet=self.pet,
            adopter=self.adopter,
            rehomer=self.rehomer,
        )
        self.authenticate(self.adopter.username, self.password)

        response = self.client.post(
            reverse("conversation-message-create", args=[conversation.id]),
            {"body": "Hi, how old is Milo exactly?"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertEqual(conversation.messages.count(), 1)
        self.assertEqual(response.data["messages"][-1]["body"], "Hi, how old is Milo exactly?")

    def test_non_member_cannot_access_conversation(self):
        conversation = Conversation.objects.create(
            pet=self.pet,
            adopter=self.adopter,
            rehomer=self.rehomer,
        )
        self.authenticate(self.other_adopter.username, self.password)

        response = self.client.get(reverse("conversation-detail", args=[conversation.id]))

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN, response.data)

    def test_unverified_rehomer_cannot_create_pet(self):
        unverified_rehomer = User.objects.create_user(
            username="rehomer2",
            email="rehomer2@example.com",
            password=self.password,
            role="rehomer",
            rehomer_verification_status=User.INCOMPLETE,
        )
        self.authenticate(unverified_rehomer.username, self.password)

        response = self.client.post(
            reverse("pet-create"),
            {"name": "Blocked", "species": "dog"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN, response.data)
        self.assertEqual(
            response.data["detail"],
            "Complete rehomer verification before listing pets.",
        )

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
        self.assertEqual(response.data["energy_level"], self.pet.energy_level)
        self.assertEqual(response.data["good_with_children"], self.pet.good_with_children)

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

    def test_owner_can_add_additional_pet_image(self):
        PetImage.objects.create(
            pet=self.pet,
            image_url="https://example.com/pets/milo-main.jpg",
            is_main=True,
        )
        self.authenticate(self.rehomer.username, self.password)

        response = self.client.patch(
            reverse("pet-detail", args=[self.pet.id]),
            {"additional_image_url": "https://example.com/pets/milo-side.jpg"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertTrue(
            PetImage.objects.filter(
                pet=self.pet,
                image_url="https://example.com/pets/milo-side.jpg",
                is_main=False,
            ).exists()
        )

    def test_owner_cannot_update_locked_pet_fields(self):
        self.authenticate(self.rehomer.username, self.password)

        response = self.client.patch(
            reverse("pet-detail", args=[self.pet.id]),
            {"name": "Changed Name"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST, response.data)
        self.pet.refresh_from_db()
        self.assertEqual(self.pet.name, "Milo")

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
        notification = Notification.objects.get(recipient=self.rehomer, pet=self.pet)
        self.assertEqual(notification.actor, self.adopter)
        self.assertEqual(notification.type, Notification.WISHLIST_SAVED)
        self.assertIn("saved Milo to their Pet Pouch", notification.message)

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
        self.assertEqual(
            Notification.objects.filter(
                recipient=self.rehomer,
                actor=self.adopter,
                pet=self.pet,
                type=Notification.WISHLIST_SAVED,
            ).count(),
            1,
        )

    def test_user_cannot_delete_another_users_wishlist_item(self):
        wishlist_item = PetWishlist.objects.create(user=self.other_adopter, pet=self.pet)
        self.authenticate(self.adopter.username, self.password)

        response = self.client.delete(reverse("wishlist-delete", args=[wishlist_item.id]))

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND, response.data)
        self.assertTrue(PetWishlist.objects.filter(pk=wishlist_item.id).exists())

    def test_rehomer_can_list_own_notifications(self):
        notification = Notification.objects.create(
            recipient=self.rehomer,
            actor=self.adopter,
            pet=self.pet,
            type=Notification.WISHLIST_SAVED,
            title="Pet saved to wishlist",
            message="Adopter saved Milo to their Pet Pouch.",
        )
        Notification.objects.create(
            recipient=self.adopter,
            actor=self.rehomer,
            pet=self.pet,
            type=Notification.WISHLIST_SAVED,
            title="Irrelevant",
            message="Should not be returned.",
        )
        self.authenticate(self.rehomer.username, self.password)

        response = self.client.get(reverse("notification-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["id"], notification.id)

    def test_rehomer_can_mark_notification_read(self):
        notification = Notification.objects.create(
            recipient=self.rehomer,
            actor=self.adopter,
            pet=self.pet,
            type=Notification.WISHLIST_SAVED,
            title="Pet saved to wishlist",
            message="Adopter saved Milo to their Pet Pouch.",
        )
        self.authenticate(self.rehomer.username, self.password)

        response = self.client.patch(
            reverse("notification-mark-read", args=[notification.id]),
            {},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        notification.refresh_from_db()
        self.assertTrue(notification.read)

    def test_notification_unread_count_only_counts_current_users_unread_notifications(self):
        Notification.objects.create(
            recipient=self.rehomer,
            actor=self.adopter,
            pet=self.pet,
            type=Notification.WISHLIST_SAVED,
            title="Unread one",
            message="Unread one",
        )
        Notification.objects.create(
            recipient=self.rehomer,
            actor=self.other_adopter,
            pet=self.pet,
            type=Notification.WISHLIST_SAVED,
            title="Unread two",
            message="Unread two",
        )
        Notification.objects.create(
            recipient=self.rehomer,
            actor=self.adopter,
            pet=self.pet,
            type=Notification.WISHLIST_SAVED,
            title="Read one",
            message="Read one",
            read=True,
        )
        Notification.objects.create(
            recipient=self.adopter,
            actor=self.rehomer,
            pet=self.pet,
            type=Notification.WISHLIST_SAVED,
            title="Other user's unread",
            message="Other user's unread",
        )
        self.authenticate(self.rehomer.username, self.password)

        response = self.client.get(reverse("notification-unread-count"))

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertEqual(response.data["count"], 2)
