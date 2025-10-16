from django.contrib import admin
from django.utils.html import format_html
from .models import Order, OrderItem, OrderEvent
from core.admin import marketplace_admin


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ('product', 'quantity', 'price', 'line_total')
    fields = ('product', 'quantity', 'price', 'line_total')

    def line_total(self, obj):
        return obj.line_total()
    line_total.short_description = 'Total'


class OrderEventInline(admin.TabularInline):
    model = OrderEvent
    extra = 0
    readonly_fields = ('status', 'note', 'created_at')
    fields = ('status', 'note', 'created_at')
    ordering = ('-created_at',)


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('id', 'customer', 'vendor', 'rider', 'status', 'total_amount', 'created_at')
    list_filter = ('status', 'created_at', 'vendor')
    search_fields = ('id', 'customer__username', 'vendor__name', 'rider__user__username')
    readonly_fields = ('created_at', 'updated_at', 'subtotal_amount', 'total_amount')
    inlines = [OrderItemInline, OrderEventInline]
    fieldsets = (
        ('Order Information', {
            'fields': ('customer', 'vendor', 'rider', 'status')
        }),
        ('Financial Information', {
            'fields': ('subtotal_amount', 'delivery_fee', 'total_amount')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    actions = ['mark_pending', 'mark_accepted', 'mark_assigned', 'mark_on_way', 'mark_delivered', 'mark_cancelled']

    def mark_pending(self, request, queryset):
        queryset.update(status=Order.Status.PENDING)
        self.message_user(request, f"Marked {queryset.count()} order(s) as pending")
    mark_pending.short_description = "Mark selected orders as pending"

    def mark_accepted(self, request, queryset):
        queryset.update(status=Order.Status.ACCEPTED)
        self.message_user(request, f"Marked {queryset.count()} order(s) as accepted")
    mark_accepted.short_description = "Mark selected orders as accepted"

    def mark_assigned(self, request, queryset):
        queryset.update(status=Order.Status.ASSIGNED)
        self.message_user(request, f"Marked {queryset.count()} order(s) as assigned")
    mark_assigned.short_description = "Mark selected orders as assigned"

    def mark_on_way(self, request, queryset):
        queryset.update(status=Order.Status.ON_WAY)
        self.message_user(request, f"Marked {queryset.count()} order(s) as on the way")
    mark_on_way.short_description = "Mark selected orders as on the way"

    def mark_delivered(self, request, queryset):
        queryset.update(status=Order.Status.DELIVERED)
        self.message_user(request, f"Marked {queryset.count()} order(s) as delivered")
    mark_delivered.short_description = "Mark selected orders as delivered"

    def mark_cancelled(self, request, queryset):
        queryset.update(status=Order.Status.CANCELLED)
        self.message_user(request, f"Marked {queryset.count()} order(s) as cancelled")
    mark_cancelled.short_description = "Mark selected orders as cancelled"


@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = ('order', 'product', 'quantity', 'price', 'line_total')
    list_filter = ('order__status', 'product__vendor')
    search_fields = ('order__id', 'product__name', 'product__vendor__name')
    readonly_fields = ('line_total',)

    def line_total(self, obj):
        return obj.line_total()
    line_total.short_description = 'Total'


@admin.register(OrderEvent)
class OrderEventAdmin(admin.ModelAdmin):
    list_display = ('order', 'status', 'note', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('order__id', 'note')
    readonly_fields = ('created_at',)
    ordering = ('-created_at',)


# Register with custom admin site
marketplace_admin.register(Order, OrderAdmin)
marketplace_admin.register(OrderItem, OrderItemAdmin)
marketplace_admin.register(OrderEvent, OrderEventAdmin)
