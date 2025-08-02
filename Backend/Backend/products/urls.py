from django.urls import path
from .views import product_list, category_list, SignupView, LoginView,product_search

urlpatterns = [
    path('products/', product_list),
    path('categories/', category_list, name="category-list"),
    path("signup/", SignupView.as_view(), name="signup"),
    path("login/", LoginView.as_view(), name="login"),
    path("product_search/", product_search, name="product-search"),  
]
