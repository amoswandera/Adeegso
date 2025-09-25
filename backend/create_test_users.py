#!/usr/bin/env python
"""Django management command to create test users for development."""

import os
import sys
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth.models import User
from apps.accounts.models import Account, Vendor

def create_test_users():
    """Create test users for development."""

    # Test users data
    test_users = [
        {
            'username': 'admin1',
            'password': 'admin123',
            'email': 'admin@example.com',
            'first_name': 'Admin',
            'last_name': 'User',
            'phone': '+1234567890',
            'role': 'admin'
        },
        {
            'username': 'vendor1',
            'password': 'vendor123',
            'email': 'vendor@example.com',
            'first_name': 'Vendor',
            'last_name': 'User',
            'phone': '+1234567891',
            'role': 'vendor',
            'vendor_name': 'Test Restaurant',
            'vendor_location': 'Test City',
            'vendor_approved': True
        },
        {
            'username': 'customer1',
            'password': 'customer123',
            'email': 'customer@example.com',
            'first_name': 'Customer',
            'last_name': 'User',
            'phone': '+1234567892',
            'role': 'customer'
        }
    ]

    for user_data in test_users:
        # Check if user already exists
        if User.objects.filter(username=user_data['username']).exists():
            print(f"User {user_data['username']} already exists, skipping...")
            continue

        # Create Django User
        user = User.objects.create_user(
            username=user_data['username'],
            password=user_data['password'],
            email=user_data['email'],
            first_name=user_data.get('first_name', ''),
            last_name=user_data.get('last_name', '')
        )

        # Create Account
        account = Account.objects.create(
            user=user,
            role=user_data['role'],
            phone_number=user_data['phone'],
            is_verified=True
        )

        # Create Vendor if role is vendor
        if user_data['role'] == 'vendor':
            vendor_data = user_data.get('vendor_name', 'Test Restaurant')
            vendor_location = user_data.get('vendor_location', 'Test City')
            vendor_approved = user_data.get('vendor_approved', False)

            Vendor.objects.create(
                owner=user,
                name=vendor_data,
                location=vendor_location,
                approved=vendor_approved,
                commission_rate=10.00,
                rating=4.5,
                rating_count=100
            )

        print(f"Created user: {user_data['username']} (Role: {user_data['role']})")

if __name__ == '__main__':
    print("Creating test users...")
    create_test_users()
    print("Test users created successfully!")
    print("\nTest Credentials:")
    print("- Admin: admin1 / admin123")
    print("- Vendor: vendor1 / vendor123")
    print("- Customer: customer1 / customer123")
