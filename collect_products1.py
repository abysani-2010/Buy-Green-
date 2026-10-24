#!/usr/bin/env python3

import json
import time
import random
import requests

CATEGORIES = {
    "multigrain_slided_breads": [
        "0096619020256",
        "0014100085980",
         "0073130005498",
        "0019016009488",
        "0073472001202",
        "0013764027138",
        "0013764028036",
        "00209588",
        "0762612551232",
        "0070733778965",
        "9555829100017",
        "0011110135483",
    ],
    "peanut_butter": [
        "4099100033045",
        "0037600105330",
        "0036192127010",
        "0044082032214",
        "0096619555505",
        "0051500053300",
        "0074822610631",
        "0037600106740",
        "0051500243220",
        "0194346116607",
    ],
    "fruit_jam": [
        "0041800502189",
        "0051500040027",
        "0051500012284",
        "0051500012291",
        "0711381024744",
        "0711381000663",
        "0067275007646",
        "0099482500634",
        "0096619217939",
        "00688628",
        "00964784",

    ],
}

OUTPUT_FILE = "products.json"
FIELDS = (
    "product_name,brands,ecoscore_grade,"
    "ecoscore_score,image_front_url"
)

# Open Food Facts asks for an identifiable User-Agent.
session = requests.Session()
session.headers.update({
    "User-Agent": "SustainableShoppingPrototype/1.0 (ananyasanvi.b@gmail.coml)"
})


def fetch_product(barcode):
    url = f"https://world.openfoodfacts.org/api/v2/product/{barcode}.json"

    for attempt in range(5):
        try:
            response = session.get(
                url,
                params={"fields": FIELDS},
                timeout=30
            )

            if response.status_code == 429 or response.status_code >= 500:
                if attempt == 4:
                    response.raise_for_status()

                # Respect Retry-After when the server provides it.
                retry_after = response.headers.get("Retry-After")
                try:
                    delay = float(retry_after)
                except (TypeError, ValueError):
                    delay = min(10 * (2 ** attempt), 120)

                delay += random.uniform(0, 2)
                print(f"  Server busy ({response.status_code}). "
                      f"Waiting {delay:.0f}s...")
                time.sleep(delay)
                continue

            response.raise_for_status()
            data = response.json()

            if data.get("status") != 1:
                print(f"  Product not found: {barcode}")
                return None

            item = data.get("product", {})
            return {
                "barcode": barcode,
                "product_name": item.get("product_name") or None,
                "brands": item.get("brands") or None,
                "ecoscore_grade": item.get("ecoscore_grade") or None,
                "ecoscore_score": item.get("ecoscore_score"),
                "image_url": item.get("image_front_url") or None,
            }

        except (requests.ConnectionError, requests.Timeout) as error:
            if attempt == 4:
                print(f"  Network error for {barcode}: {error}")
                return None

            delay = min(10 * (2 ** attempt), 120)
            print(f"  Network issue. Retrying in {delay}s...")
            time.sleep(delay)

        except requests.HTTPError as error:
            print(f"  HTTP error for {barcode}: {error}")
            return None

    return None


# Load existing data to preserve progress from previous runs.
try:
    with open(OUTPUT_FILE, "r", encoding="utf-8") as file:
        products_by_category = json.load(file)
except FileNotFoundError:
    products_by_category = {}

# Keep existing products and skip barcodes already collected.
seen_barcodes = {
    str(product.get("barcode"))
    for products in products_by_category.values()
    for product in products
}

def save_progress():
    with open(OUTPUT_FILE, "w", encoding="utf-8") as file:
        json.dump(
            products_by_category, file, indent=2, ensure_ascii=False
        )
        file.write("\n")


for category, barcodes in CATEGORIES.items():
    category_products = products_by_category.setdefault(category, [])

    print(f"\nProcessing category: {category}")

    for barcode in barcodes:
        barcode = str(barcode).strip()

        if not barcode:
            continue

        if barcode in seen_barcodes:
            print(f"  Already collected: {barcode}")
            continue

        print(f"  Fetching {barcode}...")
        product = fetch_product(barcode)

        if product is not None:
            category_products.append(product)
            seen_barcodes.add(barcode)
            print(f"  Added: {product['product_name']}")

        # Save even if this barcode wasn't found.
        save_progress()

        # Stay below the documented product-request limit.
        time.sleep(5)

total = sum(len(items) for items in products_by_category.values())
print(f"\nFinished! {total} products saved to {OUTPUT_FILE}.")
