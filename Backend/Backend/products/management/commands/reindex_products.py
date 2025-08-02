from django.core.management.base import BaseCommand
from products.models import Product
from elasticsearch import Elasticsearch

class Command(BaseCommand):
    help = "Reindex all products from MySQL into Elasticsearch"

    def handle(self, *args, **options):
        es = Elasticsearch(
            "https://localhost:9200",
            basic_auth=("elastic", "98pqqnnYuP45sJrfCKna"),  # your ES password
            verify_certs=False
        )

        # Create index if it doesn't exist
        if not es.indices.exists(index="products"):
            es.indices.create(
                index="products",
                body={
                    "mappings": {
                        "properties": {
                            "name": {"type": "text"},
                            "description": {"type": "text"},
                            "price": {"type": "float"},
                            "category_name": {"type": "keyword"},
                            "category_id": {"type": "integer"},
                        }
                    }
                }
            )
            self.stdout.write(self.style.SUCCESS("✅ Created 'products' index in Elasticsearch."))
        else:
            self.stdout.write("ℹ️ 'products' index already exists.")

        # Index products
        count = 0
        for product in Product.objects.all():
            es.index(
                index="products",
                id=product.product_id,
                document={
                    "name": product.name,
                    "description": product.description,
                    "price": float(product.price),
                    "category_name": "",
                    "category_id": product.category_id,
                }
            )
            count += 1

        self.stdout.write(self.style.SUCCESS(f"✅ Indexed {count} products into Elasticsearch."))
