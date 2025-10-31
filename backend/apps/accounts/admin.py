from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.models import User
from .models import Account, Vendor, Rider, Wallet
from core.admin import marketplace_admin


class AccountInline(admin.StackedInline):
    model = Account
    can_delete = False
    verbose_name_plural = 'Account Profiles'
    readonly_fields = ('created_at', 'updated_at')


class CustomUserAdmin(UserAdmin):
    inlines = (AccountInline,)
    list_display = ('username', 'email', 'first_name', 'last_name', 'is_staff', 'get_role')
    list_filter = ('is_staff', 'is_superuser', 'is_active', 'date_joined')

    def get_role(self, obj):
        try:
            return obj.account.role
        except Account.DoesNotExist:
            return 'No Account'
    get_role.short_description = 'Role'


@admin.register(Account)
class AccountAdmin(admin.ModelAdmin):
    list_display = ('user', 'role', 'phone_number', 'is_verified', 'created_at')
    list_filter = ('role', 'is_verified', 'created_at')
    search_fields = ('user__username', 'user__email', 'phone_number')
    readonly_fields = ('created_at', 'updated_at')
    fieldsets = (
        ('User Information', {
            'fields': ('user', 'role', 'phone_number')
        }),
        ('Verification', {
            'fields': ('is_verified',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(Vendor)
class VendorAdmin(admin.ModelAdmin):
    list_display = ('name', 'owner', 'location', 'approved', 'rating', 'commission_rate', 'created_at')
    list_filter = ('approved', 'rating', 'created_at')
    search_fields = ('name', 'owner__username', 'owner__email', 'location')
    readonly_fields = ('created_at', 'updated_at', 'rating_count')
    fieldsets = (
        ('Basic Information', {
            'fields': ('owner', 'name', 'location')
        }),
        ('Business Status', {
            'fields': ('approved', 'commission_rate', 'discount_percent')
        }),
        ('Ratings & Reviews', {
            'fields': ('rating', 'rating_count'),
            'classes': ('collapse',)
        }),
        ('Location Data', {
            'fields': ('latitude', 'longitude'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    actions = ['approve_vendors', 'reject_vendors']

    def approve_vendors(self, request, queryset):
        queryset.update(approved=True)
        self.message_user(request, f"Approved {queryset.count()} vendor(s)")
    approve_vendors.short_description = "Approve selected vendors"

    def reject_vendors(self, request, queryset):
        queryset.update(approved=False)
        self.message_user(request, f"Rejected {queryset.count()} vendor(s)")
    reject_vendors.short_description = "Reject selected vendors"


@admin.register(Rider)
class RiderAdmin(admin.ModelAdmin):
    list_display = ('user', 'verified', 'get_wallet_balance', 'created_at')
    list_filter = ('verified', 'created_at')
    search_fields = ('user__username', 'user__email')
    readonly_fields = ('created_at', 'updated_at', 'get_wallet_balance')
    fieldsets = (
        ('Rider Information', {
            'fields': ('user', 'verified')
        }),
        ('Financial Information', {
            'fields': ('get_wallet_balance',),
            'classes': ('collapse',)
        }),
        ('Vehicle Information', {
            'fields': ('vehicle_type', 'license_plate'),
            'classes': ('collapse',)
        }),
        ('Location & Status', {
            'fields': ('current_latitude', 'current_longitude', 'last_location_update', 'is_online'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    actions = ['verify_riders', 'unverify_riders']

    def get_wallet_balance(self, obj):
        """Display wallet balance in admin"""
        try:
            return f"${obj.wallet_balance:.2f}"
        except:
            return "$0.00"
    get_wallet_balance.short_description = 'Wallet Balance'

    def verify_riders(self, request, queryset):
        queryset.update(verified=True)
        self.message_user(request, f"Verified {queryset.count()} rider(s)")
    verify_riders.short_description = "Verify selected riders"

    def unverify_riders(self, request, queryset):
        queryset.update(verified=False)
        self.message_user(request, f"Unverified {queryset.count()} rider(s)")
    unverify_riders.short_description = "Unverify selected riders"


# Register with custom admin site instead of default
marketplace_admin.register(User, CustomUserAdmin)
marketplace_admin.register(Account, AccountAdmin)
marketplace_admin.register(Vendor, VendorAdmin)
marketplace_admin.register(Rider, RiderAdmin)
