from django.db import models


#creating db models here :
#db table name : product
class Product(models.Model):
    product_id = models.AutoField(primary_key=True, db_column='product_id')
    name = models.CharField(max_length=200)
    image_url = models.TextField()
    description = models.TextField()
    price = models.DecimalField(max_digits=10, decimal_places=2)
    quantity = models.IntegerField()
    category_id = models.IntegerField()

    class Meta:
        managed = False
        db_table = 'product'


#db table name : category
class Category(models.Model):
    id = models.AutoField(primary_key=True, db_column="id")
    name = models.CharField(max_length=100)
    image_url = models.TextField(blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        db_table = "category"
        managed = False  # since table exists already

    def __str__(self):
        return self.name


class UserData(models.Model):
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    dob = models.DateField()
    email = models.EmailField(unique=True)
    password_hash = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.email