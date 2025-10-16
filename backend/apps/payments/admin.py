from django.contrib import admin
from django.utils.html import format_html
from .models import Payment, AuditLog
from core.admin import marketplace_admin


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('order', 'provider', 'amount', 'status', 'transaction_reference', 'created_at')
    list_filter = ('provider', 'status', 'created_at')
    search_fields = ('order__id', 'transaction_reference', 'order__customer__username')
    readonly_fields = ('created_at', 'updated_at', 'raw_payload')
    fieldsets = (
        ('Payment Information', {
            'fields': ('order', 'provider', 'amount', 'status')
        }),
        ('Transaction Details', {
            'fields': ('transaction_reference', 'raw_payload')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    actions = ['mark_confirmed', 'mark_failed']

    def mark_confirmed(self, request, queryset):
        queryset.update(status=Payment.Status.CONFIRMED)
        self.message_user(request, f"Marked {queryset.count()} payment(s) as confirmed")
    mark_confirmed.short_description = "Mark selected payments as confirmed"

    def mark_failed(self, request, queryset):
        queryset.update(status=Payment.Status.FAILED)
        self.message_user(request, f"Marked {queryset.count()} payment(s) as failed")
    mark_failed.short_description = "Mark selected payments as failed"

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('order__customer')


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ('entity_type', 'entity_id', 'action', 'actor_id', 'created_at')
    list_filter = ('entity_type', 'action', 'created_at')
    search_fields = ('entity_type', 'entity_id', 'action', 'metadata')
    readonly_fields = ('created_at', 'metadata')
    fieldsets = (
        ('Log Information', {
            'fields': ('entity_type', 'entity_id', 'action', 'actor_id')
        }),
        ('Metadata', {
            'fields': ('metadata',),
            'classes': ('collapse',)
        }),
        ('Timestamp', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )
    ordering = ('-created_at',)

    def has_add_permission(self, request):
        return False  # Audit logs should not be manually created

    def has_change_permission(self, request, obj=None):
        return False  # Audit logs should not be modified

    def has_delete_permission(self, request, obj=None):
        return False  # Audit logs should not be deleted


# Register with custom admin site
marketplace_admin.register(Payment, PaymentAdmin)
marketplace_admin.register(AuditLog, AuditLogAdmin)
