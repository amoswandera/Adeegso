from django.contrib import admin
from django.contrib.admin import AdminSite
from django.utils.html import format_html


class MarketplaceAdminSite(AdminSite):
    site_header = 'Marketplace Administration'
    site_title = 'Marketplace Admin'
    index_title = 'Marketplace Management'
    site_url = '/'

    def each_context(self, request):
        context = super().each_context(request)
        context['site_description'] = 'Comprehensive marketplace management system'
        return context


# Create the admin site instance
marketplace_admin = MarketplaceAdminSite(name='marketplace_admin')


# Custom admin views for dashboard
def dashboard_view(request):
    """Custom dashboard view for the marketplace"""
    context = {
        'title': 'Marketplace Dashboard',
        'site_title': marketplace_admin.site_title,
        'site_header': marketplace_admin.site_header,
        'index_title': marketplace_admin.index_title,
    }
    return marketplace_admin.each_context(request) | context


# Register models with the custom admin site
# Note: Models are registered in their respective app admin.py files
# This ensures they use the custom admin site instead of the default one

# Configure the default admin site to use our custom site
admin.site = marketplace_admin
