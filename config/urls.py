"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

from django.contrib import admin
from django.urls import path,include
from rest_framework_simplejwt.views import TokenRefreshView
from apps.users.throttles import CustomTokenObtainPairView
from django.conf import settings
from django.conf.urls.static import static
#  What TokenObtainPairView does secretly
# Internally it:
# 1️⃣ takes username + password
# 2️⃣ verifies user
# 3️⃣ generates JWT token
# 4️⃣ returns response
# Now let’s write this ourselves.


urlpatterns = [
    path('admin/', admin.site.urls),
    path("api/users/",include("apps.users.urls")), # apps.users.urls path to apps urls 

    path("api/token/",CustomTokenObtainPairView.as_view()), # When someone visits /api/token/, run JWT login logic automatically. This view comes from rest_framework_simplejwt.views package
    # this will give me refresh and access token i pass username + password to it.

    path("api/token/refresh/",TokenRefreshView.as_view()), # this view is used to refresh jwt token

    path("api/",include("apps.posts.urls")),
    
]
 
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)  # for accessing images
