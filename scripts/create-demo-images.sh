#!/bin/bash

# Create product image directories
mkdir -p /home/iftikhar/www/my-project/pos-backend/uploads/products

echo "📸 Creating sample product images..."

# Function to create a colored SVG placeholder
create_svg_placeholder() {
    local name="$1"
    local color="$2"
    local emoji="$3"
    local file="$4"
    
    cat > "$file" << EOF
<svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
  <rect width="400" height="300" fill="$color"/>
  <text x="200" y="140" font-family="Arial, sans-serif" font-size="48" text-anchor="middle" fill="white">$emoji</text>
  <text x="200" y="180" font-family="Arial, sans-serif" font-size="18" text-anchor="middle" fill="white">$name</text>
  <text x="200" y="200" font-family="Arial, sans-serif" font-size="12" text-anchor="middle" fill="rgba(255,255,255,0.8)">Demo Image</text>
</svg>
EOF
}

# Create burger images
create_svg_placeholder "Classic Burger" "#8B4513" "🍔" "/home/iftikhar/www/my-project/pos-backend/uploads/products/burger-classic.svg"
create_svg_placeholder "Zinger Burger" "#DC143C" "🍔" "/home/iftikhar/www/my-project/pos-backend/uploads/products/burger-zinger.svg"
create_svg_placeholder "Cheese Burger" "#FFD700" "🍔" "/home/iftikhar/www/my-project/pos-backend/uploads/products/burger-cheese.svg"
create_svg_placeholder "Mushroom Burger" "#8FBC8F" "🍔" "/home/iftikhar/www/my-project/pos-backend/uploads/products/burger-mushroom.svg"
create_svg_placeholder "Spicy Burger" "#FF4500" "🍔" "/home/iftikhar/www/my-project/pos-backend/uploads/products/burger-spicy.svg"

# Create pizza images
create_svg_placeholder "Margherita Pizza" "#FF6347" "🍕" "/home/iftikhar/www/my-project/pos-backend/uploads/products/pizza-margherita.svg"
create_svg_placeholder "Pepperoni Pizza" "#B22222" "🍕" "/home/iftikhar/www/my-project/pos-backend/uploads/products/pizza-pepperoni.svg"
create_svg_placeholder "BBQ Pizza" "#8B4513" "🍕" "/home/iftikhar/www/my-project/pos-backend/uploads/products/pizza-bbq.svg"
create_svg_placeholder "Veggie Pizza" "#228B22" "🍕" "/home/iftikhar/www/my-project/pos-backend/uploads/products/pizza-veggie.svg"
create_svg_placeholder "Fajita Pizza" "#DAA520" "🍕" "/home/iftikhar/www/my-project/pos-backend/uploads/products/pizza-fajita.svg"

# Create beverage images
create_svg_placeholder "Orange Juice" "#FFA500" "🍊" "/home/iftikhar/www/my-project/pos-backend/uploads/products/juice-orange.svg"
create_svg_placeholder "Mango Shake" "#FFD700" "🥭" "/home/iftikhar/www/my-project/pos-backend/uploads/products/shake-mango.svg"
create_svg_placeholder "Coca Cola" "#DC143C" "🥤" "/home/iftikhar/www/my-project/pos-backend/uploads/products/coke-can.svg"
create_svg_placeholder "Water" "#4169E1" "💧" "/home/iftikhar/www/my-project/pos-backend/uploads/products/water.svg"
create_svg_placeholder "Coffee" "#8B4513" "☕" "/home/iftikhar/www/my-project/pos-backend/uploads/products/coffee.svg"
create_svg_placeholder "Green Tea" "#90EE90" "🍵" "/home/iftikhar/www/my-project/pos-backend/uploads/products/green-tea.svg"

# Create dessert images
create_svg_placeholder "Brownie" "#654321" "🍫" "/home/iftikhar/www/my-project/pos-backend/uploads/products/brownie.svg"
create_svg_placeholder "Cheesecake" "#FFF8DC" "🍰" "/home/iftikhar/www/my-project/pos-backend/uploads/products/cheesecake.svg"
create_svg_placeholder "Ice Cream" "#FFB6C1" "🍦" "/home/iftikhar/www/my-project/pos-backend/uploads/products/icecream.svg"
create_svg_placeholder "Gulab Jamun" "#CD853F" "🍯" "/home/iftikhar/www/my-project/pos-backend/uploads/products/gulab-jamun.svg"

# Create more sample images for other categories
create_svg_placeholder "Chicken Tikka" "#FF8C00" "🍗" "/home/iftikhar/www/my-project/pos-backend/uploads/products/tikka.svg"
create_svg_placeholder "Seekh Kabab" "#8B4513" "🍢" "/home/iftikhar/www/my-project/pos-backend/uploads/products/seekh-kabab.svg"
create_svg_placeholder "Grilled Fish" "#4682B4" "🐟" "/home/iftikhar/www/my-project/pos-backend/uploads/products/grilled-fish.svg"
create_svg_placeholder "Lamb Chops" "#A0522D" "🥩" "/home/iftikhar/www/my-project/pos-backend/uploads/products/lamb-chops.svg"
create_svg_placeholder "Mixed Grill" "#8B4513" "🍖" "/home/iftikhar/www/my-project/pos-backend/uploads/products/mixed-grill.svg"

create_svg_placeholder "Spaghetti" "#FF6347" "🍝" "/home/iftikhar/www/my-project/pos-backend/uploads/products/spaghetti.svg"
create_svg_placeholder "Alfredo" "#F5F5DC" "🍝" "/home/iftikhar/www/my-project/pos-backend/uploads/products/alfredo.svg"
create_svg_placeholder "Penne" "#DC143C" "🍝" "/home/iftikhar/www/my-project/pos-backend/uploads/products/penne.svg"

create_svg_placeholder "Caesar Salad" "#32CD32" "🥗" "/home/iftikhar/www/my-project/pos-backend/uploads/products/caesar-salad.svg"
create_svg_placeholder "Greek Salad" "#228B22" "🥗" "/home/iftikhar/www/my-project/pos-backend/uploads/products/greek-salad.svg"
create_svg_placeholder "Garden Salad" "#90EE90" "🥗" "/home/iftikhar/www/my-project/pos-backend/uploads/products/garden-salad.svg"

create_svg_placeholder "Club Sandwich" "#DAA520" "🥪" "/home/iftikhar/www/my-project/pos-backend/uploads/products/club-sandwich.svg"
create_svg_placeholder "Chicken Wrap" "#CD853F" "🌯" "/home/iftikhar/www/my-project/pos-backend/uploads/products/chicken-wrap.svg"
create_svg_placeholder "Panini" "#DEB887" "🥪" "/home/iftikhar/www/my-project/pos-backend/uploads/products/panini.svg"

create_svg_placeholder "French Fries" "#FFD700" "🍟" "/home/iftikhar/www/my-project/pos-backend/uploads/products/fries.svg"
create_svg_placeholder "Onion Rings" "#DAA520" "🧅" "/home/iftikhar/www/my-project/pos-backend/uploads/products/onion-rings.svg"
create_svg_placeholder "Garlic Bread" "#F5DEB3" "🥖" "/home/iftikhar/www/my-project/pos-backend/uploads/products/garlic-bread.svg"
create_svg_placeholder "Chicken Wings" "#FF8C00" "🍗" "/home/iftikhar/www/my-project/pos-backend/uploads/products/wings.svg"
create_svg_placeholder "Mozzarella Sticks" "#FFF8DC" "🧀" "/home/iftikhar/www/my-project/pos-backend/uploads/products/mozz-sticks.svg"

create_svg_placeholder "Chicken Biryani" "#FF8C00" "🍚" "/home/iftikhar/www/my-project/pos-backend/uploads/products/chicken-biryani.svg"
create_svg_placeholder "Mutton Biryani" "#8B4513" "🍚" "/home/iftikhar/www/my-project/pos-backend/uploads/products/mutton-biryani.svg"
create_svg_placeholder "Pulao" "#DAA520" "🍚" "/home/iftikhar/www/my-project/pos-backend/uploads/products/pulao.svg"
create_svg_placeholder "Fried Rice" "#FFD700" "🍚" "/home/iftikhar/www/my-project/pos-backend/uploads/products/fried-rice.svg"

echo "✅ Created sample product images in uploads/products/"
echo "📁 Total images created: $(ls -1 /home/iftikhar/www/my-project/pos-backend/uploads/products/*.svg | wc -l)"