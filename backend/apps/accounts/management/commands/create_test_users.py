from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from apps.accounts.models import Account, Vendor, Rider


class Command(BaseCommand):
    help = 'Create test users for development'

    def handle(self, *args, **options):
        # Create test users
        users_data = [
            {
                'username': 'admin1',
                'email': 'admin@example.com',
                'password': 'admin123',
                'first_name': 'Admin',
                'last_name': 'User',
                'role': Account.Role.ADMIN,
                'phone': '+1234567890'
            },
            {
                'username': 'vendor1',
                'email': 'vendor@example.com',
                'password': 'vendor123',
                'first_name': 'Vendor',
                'last_name': 'User',
                'role': Account.Role.VENDOR,
                'phone': '+1234567891'
            },
            {
                'username': 'rider1',
                'email': 'rider@example.com',
                'password': 'rider123',
                'first_name': 'Rider',
                'last_name': 'User',
                'role': Account.Role.RIDER,
                'phone': '+1234567892'
            }
        ]

        for user_data in users_data:
            # Check if user already exists
            if User.objects.filter(username=user_data['username']).exists():
                self.stdout.write(
                    self.style.WARNING(f"User {user_data['username']} already exists")
                )
                continue

            # Create user
            user = User.objects.create_user(
                username=user_data['username'],
                email=user_data['email'],
                password=user_data['password'],
                first_name=user_data['first_name'],
                last_name=user_data['last_name']
            )

            # Create account
            account = Account.objects.create(
                user=user,
                role=user_data['role'],
                phone_number=user_data['phone'],
                is_verified=True
            )

            # Create vendor or rider record if needed
            if user_data['role'] == Account.Role.VENDOR:
                Vendor.objects.create(
                    owner=user,
                    name=f"{user.first_name} Restaurant",
                    location="Test Location",
                    approved=True,
                    commission_rate=10.00,
                    rating=4.5,
                    rating_count=100
                )
            elif user_data['role'] == Account.Role.RIDER:
                Rider.objects.create(
                    user=user,
                    verified=True,
                    wallet_balance=0.00
                )

            self.stdout.write(
                self.style.SUCCESS(f"Successfully created user {user_data['username']} with role {user_data['role']}")
            )
