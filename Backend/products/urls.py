from django.urls import path
from .views import product_list, category_list, SignupView, LoginView

urlpatterns = [
    path('products/', product_list),
    path('categories/', category_list, name="category-list"),
    path("signup/", SignupView.as_view(), name="signup"),
    path("login/", LoginView.as_view(), name="login"),
]
