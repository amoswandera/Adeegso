from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from .models import Product
from core.admin import marketplace_admin


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('name', 'vendor', 'category', 'price', 'stock', 'approval_status', 'active', 'created_at')
    list_filter = ('category', 'approval_status', 'active', 'created_at', 'vendor')
    search_fields = ('name', 'description', 'vendor__name', 'vendor__owner__username')
    readonly_fields = ('created_at', 'updated_at', 'approved_by', 'approved_at')
    list_editable = ('price', 'stock', 'active', 'approval_status')
    fieldsets = (
        ('Basic Information', {
            'fields': ('vendor', 'name', 'description', 'category')
        }),
        ('Pricing & Inventory', {
            'fields': ('price', 'stock', 'active')
        }),
        ('Media', {
            'fields': ('image',),
            'classes': ('collapse',)
        }),
        ('Approval Status', {
            'fields': ('approval_status', 'approved_by', 'approved_at', 'rejection_reason')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    actions = ['approve_products', 'reject_products', 'activate_products', 'deactivate_products']

    def image_preview(self, obj):
        if obj.image:
            return format_html('<img src="{}" width="50" height="50" style="object-fit: cover;" />', obj.image.url)
        return "No Image"
    image_preview.short_description = 'Image'

    def approve_products(self, request, queryset):
        for product in queryset:
            product.approve(request.user)
        self.message_user(request, f"Approved {queryset.count()} product(s)")
    approve_products.short_description = "Approve selected products"

    def reject_products(self, request, queryset):
        reason = "Rejected by admin"  # You could make this configurable
        for product in queryset:
            product.reject(request.user, reason)
        self.message_user(request, f"Rejected {queryset.count()} product(s)")
    reject_products.short_description = "Reject selected products"

    def activate_products(self, request, queryset):
        queryset.update(active=True)
        self.message_user(request, f"Activated {queryset.count()} product(s)")
    activate_products.short_description = "Activate selected products"

    def deactivate_products(self, request, queryset):
        queryset.update(active=False)
        self.message_user(request, f"Deactivated {queryset.count()} product(s)")
    deactivate_products.short_description = "Deactivate selected products"

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('vendor', 'approved_by')


# Register with custom admin site
marketplace_admin.register(Product, ProductAdmin)
