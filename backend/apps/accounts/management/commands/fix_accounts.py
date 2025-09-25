from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from apps.accounts.models import Account
import random

class Command(BaseCommand):
    help = 'Create Account records for users who don\'t have them'

    def handle(self, *args, **options):
        users_without_accounts = User.objects.filter(account__isnull=True)
        created_count = 0

        for user in users_without_accounts:
            # Determine role based on username pattern or randomly assign
            if 'admin' in user.username.lower():
                role = Account.Role.ADMIN
            elif 'vendor' in user.username.lower():
                role = Account.Role.VENDOR
            elif 'rider' in user.username.lower():
                role = Account.Role.RIDER
            else:
                # Randomly assign role for other users
                role = random.choice([Account.Role.CUSTOMER, Account.Role.VENDOR])

            # Create account
            Account.objects.create(
                user=user,
                role=role,
                phone_number=f"+252{random.randint(1000000, 9999999)}",  # Somali phone number
                is_verified=True
            )
            created_count += 1
            self.stdout.write(f"Created account for {user.username} with role {role}")

        self.stdout.write(f"Successfully created {created_count} Account records")
