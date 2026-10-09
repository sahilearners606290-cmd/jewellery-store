// ===============================
// SUPABASE CONNECTION
// ===============================

const SUPABASE_URL = "https://jmnikkwvemnflenesnmf.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_cOS9LZAOn-Dmot7-PTqqJA_EAc11jWY";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);

// ========================================
// SHOP CUSTOMIZATION
// ========================================

const SHOP = {
    name: "Royal Jewellers",
    tagline: "Elegant Jewellery for Every Occasion",
    whatsapp: "919876543210",
    phone: "+91 98765 43210",
    instagram: "https://instagram.com/yourshop",
    address: "Lucknow, Uttar Pradesh",
    logo: "images/logo.png"
};

// Default fallback image path
const DEFAULT_IMAGE = "images/logo.png";

// ========================================
// IMAGE PATH & FALLBACK HELPER
// ========================================

function getImageUrl(path) {
    if (!path || typeof path !== "string" || path.trim() === "") {
        return DEFAULT_IMAGE;
    }
    // Agar full HTTP/HTTPS Supabase URL hai to direct return karein
    if (path.startsWith("http://") || path.startsWith("https://")) {
        return path;
    }
    // Vercel / Acode relative path fix (leading '/' remove karna)
    return path.startsWith("/") ? path.slice(1) : path;
}

// Global Image Error Handler (Broken paths / missing files fix)
window.handleImageError = function (imgElement) {
    imgElement.onerror = null; // Infinite loop rokne ke liye
    imgElement.src = DEFAULT_IMAGE;
};

// ========================================
// PRODUCTS
// ========================================

const DEFAULT_PRODUCTS = [
    { id: "default-1", name: "Elegant Necklace", price: 2499, category: "Necklaces", image: "images/product1.jpg", description: "Beautiful premium necklace." },
    { id: "default-2", name: "Classic Ring", price: 1499, category: "Rings", image: "images/product2.jpg", description: "Elegant ring for every occasion." },
    { id: "default-3", name: "Gold Earrings", price: 1999, category: "Earrings", image: "images/product3.jpg", description: "Beautiful earrings with a premium look." },
    { id: "default-4", name: "Diamond Bracelet", price: 2999, category: "Bracelets", image: "images/product4.jpg", description: "Stylish bracelet with an elegant finish." },
    { id: "default-5", name: "Royal Necklace", price: 3999, category: "Necklaces", image: "images/product5.jpg", description: "Premium necklace for special occasions." },
    { id: "default-6", name: "Designer Ring", price: 1899, category: "Rings", image: "images/product6.jpg", description: "Beautiful designer ring." }
];

const PRODUCT_STORAGE_KEY = "jewelleryProducts";
const WISHLIST_STORAGE_KEY = "jewelleryWishlist";

function normaliseProduct(product, fallbackId) {
    const categoryMap = {
        ring: "Rings",
        necklace: "Necklaces",
        earring: "Earrings",
        bracelet: "Bracelets",
        other: "Other"
    };

    const category = categoryMap[product.category] || product.category || "Other";

    return {
        id: product.id || fallbackId,
        name: String(product.name || "Untitled Product"),
        price: Number(String(product.price ?? 0).replace(/[^0-9.]/g, "")) || 0,
        category,
        image: product.image || "",
        description: String(product.description || "")
    };
}

function loadProducts() {
    let saved = [];

    try {
        saved = JSON.parse(localStorage.getItem(PRODUCT_STORAGE_KEY) || "[]");
    } catch (error) {
        saved = [];
    }

    if (!Array.isArray(saved)) saved = [];

    // Migrate older saved products: keep the original six and add saved products.
    const migratedSaved = saved.map((product, index) =>
        normaliseProduct(product, "saved-" + index + "-" + Date.now())
    );

    const products = DEFAULT_PRODUCTS.map(product => ({ ...product }));

    migratedSaved.forEach(savedProduct => {
        const existing = products.find(product => product.id === savedProduct.id);
        if (!existing) products.push(savedProduct);
    });

    // Store the complete catalog so refresh/delete/edit remain consistent.
    localStorage.setItem(PRODUCT_STORAGE_KEY, JSON.stringify(products));

    return products;
}

let PRODUCTS = loadProducts();
function saveProducts() {
    localStorage.setItem(
        PRODUCT_STORAGE_KEY,
        JSON.stringify(PRODUCTS)
    );
}

// ===============================
// SUPABASE PRODUCTS
// ===============================

async function loadProductsFromSupabase() {
    try {
        const { data, error } = await supabaseClient
            .from("products")
            .select("*")
            .order("created_at", { ascending: true });

        if (error) {
            console.error("Supabase products error:", error);
            return;
        }

        if (!data || data.length === 0) {
            console.log("No products found in Supabase.");
            return;
        }

        const supabaseProducts = data.map(product => ({
            id: String(product.id),
            name: product.name || "",
            price: Number(product.price) || 0,
            category: product.category || "Other",
            image: product.image || "",
            description: product.description || ""
        }));

        // Keep existing products + add/update Supabase products
        supabaseProducts.forEach(supabaseProduct => {
            const existingIndex = PRODUCTS.findIndex(
                product => String(product.id) === String(supabaseProduct.id)
            );

            if (existingIndex === -1) {
                PRODUCTS.push(supabaseProduct);
            } else {
                PRODUCTS[existingIndex] = supabaseProduct;
            }
        });

        console.log("Supabase products loaded:", PRODUCTS);

    } catch (error) {
        console.error("Supabase connection error:", error);
    }
}

// ========================================
// WISHLIST
// ========================================

let currentCategory = "All";

function loadWishlist() {
    let saved = [];
    try {
        saved = JSON.parse(localStorage.getItem(WISHLIST_STORAGE_KEY) || "[]");
    } catch (error) {
        saved = [];
    }

    if (!Array.isArray(saved)) return [];

    // Convert the old index-based wishlist to stable product IDs.
    return saved.map(item => {
        if (typeof item === "string" && PRODUCTS.some(p => p.id === item)) return item;
        if (Number.isInteger(item) && PRODUCTS[item]) return PRODUCTS[item].id;
        return null;
    }).filter(Boolean);
}

let wishlist = [...new Set(loadWishlist())];
localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(wishlist));

function toggleWishlist(id) {
    if (wishlist.includes(id)) {
        wishlist = wishlist.filter(item => item !== id);
    } else {
        wishlist.push(id);
    }

    localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(wishlist));
    searchProducts();
    displayWishlist();
}

// ========================================
// DISPLAY PRODUCTS
// ========================================

function displayProducts(products = PRODUCTS) {
    const productGrid = document.getElementById("productGrid");
    if (!productGrid) return;

    productGrid.innerHTML = "";

    if (products.length === 0) {
        productGrid.innerHTML = `
            <p style="text-align:center; width:100%;">
                No products found in this category.
            </p>
        `;
        return;
    }

    products.forEach(product => {
        const card = document.createElement("div");
        card.className = "product-card";

        const isWishlisted = wishlist.includes(product.id);
        const imgSrc = getImageUrl(product.image);

        card.innerHTML = `
            <div class="product-image">
                <img src="${imgSrc}" alt="${escapeHtml(product.name)}" onerror="handleImageError(this)" onclick="openProductModal('${product.id}')">
                <button class="wishlist-btn" onclick="toggleWishlist('${product.id}')">
                    ${isWishlisted ? "♥" : "♡"}
                </button>
            </div>
            <div class="product-info">
                <p class="product-category">${escapeHtml(product.category)}</p>
                <h3>${escapeHtml(product.name)}</h3>
                <p>${escapeHtml(product.description)}</p>
                <strong>₹${product.price.toLocaleString("en-IN")}</strong>
                <button class="whatsapp-product-btn" onclick="orderOnWhatsApp('${product.id}')">
                    💬 Enquire on WhatsApp
                </button>
            </div>
        `;

        productGrid.appendChild(card);
    });
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function getProduct(id) {
    return PRODUCTS.find(product => String(product.id) === String(id));
}

// ========================================
// CATEGORY FILTER + SEARCH
// ========================================

function filterProducts(category, button) {
    currentCategory = category;

    const title = document.getElementById("selectedCategoryTitle");
    if (title) {
        title.textContent = category === "All" ? "All Jewellery" : category + " Collection";
    }

    document.querySelectorAll(".category-card").forEach(btn => btn.classList.remove("active"));
    if (button) button.classList.add("active");

    searchProducts();

    const featured = document.getElementById("featured");
    if (featured) featured.scrollIntoView({ behavior: "smooth" });
}

function searchProducts() {
    const searchInput = document.getElementById("productSearch");
    const searchText = searchInput ? searchInput.value.toLowerCase().trim() : "";

    const filteredProducts = PRODUCTS.filter(product => {
        const category = product.category.toLowerCase().trim();
        const name = product.name.toLowerCase().trim();
        const description = product.description.toLowerCase().trim();

        const categoryMatch =
            currentCategory === "All" ||
            category === currentCategory.toLowerCase().trim();

        const searchMatch =
            searchText === "" ||
            name.includes(searchText) ||
            category.includes(searchText) ||
            description.includes(searchText);

        return categoryMatch && searchMatch;
    });

    displayProducts(filteredProducts);

    const resultText = document.getElementById("searchResultText");
    if (resultText) {
        resultText.textContent = filteredProducts.length === 0
            ? "No jewellery found."
            : filteredProducts.length + " products found";
    }
}

// ========================================
// WHATSAPP
// ========================================

function orderOnWhatsApp(id) {
    const product = getProduct(id);
    if (!product) return;

    const message = `Hello! I am interested in ${product.name}. Price: ₹${product.price}`;
    const url = `https://wa.me/${SHOP.whatsapp}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
}

// ========================================
// PRODUCT DETAILS MODAL
// ========================================

function openProductModal(id) {
    const product = getProduct(id);
    if (!product) return;

    const image = document.getElementById("modalImage");
    const name = document.getElementById("modalName");
    const category = document.getElementById("modalCategory");
    const price = document.getElementById("modalPrice");
    const description = document.getElementById("modalDescription");
    const whatsapp = document.getElementById("modalWhatsapp");
    const modal = document.getElementById("productModal");

    if (image) {
        image.src = getImageUrl(product.image);
        image.onerror = function () { handleImageError(this); };
    }
    if (name) name.textContent = product.name;
    if (category) category.textContent = product.category;
    if (price) price.textContent = "₹" + product.price.toLocaleString("en-IN");
    if (description) description.textContent = product.description;
    if (whatsapp) whatsapp.onclick = () => orderOnWhatsApp(product.id);
    if (modal) modal.classList.add("show");
}

function closeProductModal() {
    const modal = document.getElementById("productModal");
    if (modal) modal.classList.remove("show");
}

// ========================================
// DISPLAY WISHLIST
// ========================================

function displayWishlist() {
    const wishlistGrid = document.getElementById("wishlistGrid");
    const emptyWishlist = document.getElementById("emptyWishlist");
    if (!wishlistGrid || !emptyWishlist) return;

    wishlistGrid.innerHTML = "";

    const validWishlist = wishlist
        .map(id => getProduct(id))
        .filter(Boolean);

    if (validWishlist.length === 0) {
        emptyWishlist.style.display = "block";
        return;
    }

    emptyWishlist.style.display = "none";

    validWishlist.forEach(product => {
        const card = document.createElement("div");
        card.className = "product-card";
        const imgSrc = getImageUrl(product.image);

        card.innerHTML = `
            <div class="product-image">
                <img src="${imgSrc}" alt="${escapeHtml(product.name)}" onerror="handleImageError(this)" onclick="openProductModal('${product.id}')">
                <button class="wishlist-btn" onclick="toggleWishlist('${product.id}')">♥</button>
            </div>
            <div class="product-info">
                <p class="product-category">${escapeHtml(product.category)}</p>
                <h3>${escapeHtml(product.name)}</h3>
                <strong>₹${product.price.toLocaleString("en-IN")}</strong>
                <button class="whatsapp-product-btn" onclick="orderOnWhatsApp('${product.id}')">
                    💬 Enquire on WhatsApp
                </button>
            </div>
        `;

        wishlistGrid.appendChild(card);
    });
}

// ========================================
// MOBILE MENU
// ========================================

function toggleMenu() {
    const nav = document.getElementById("navMenu");
    if (nav) nav.classList.toggle("active");
}

// Close mobile navigation when clicking outside the menu
document.addEventListener("click", function (event) {
    const nav = document.getElementById("navMenu");
    const menuButton = document.querySelector(".menu-btn");

    if (!nav || !nav.classList.contains("active")) return;

    if (!nav.contains(event.target) &&
        !(menuButton && menuButton.contains(event.target))) {
        nav.classList.remove("active");
    }
});

// Close mobile navigation after selecting a navigation link
document.addEventListener("click", function (event) {
    const link = event.target.closest("#navMenu a");
    const nav = document.getElementById("navMenu");

    if (link && nav) {
        nav.classList.remove("active");
    }
});

// ========================================
// SHOP / CONTACT INFO
// ========================================

function loadShopInfo() {
    const shopName = document.getElementById("shopName");
    const shopLogo = document.getElementById("shopLogo");

    if (shopName) shopName.textContent = SHOP.name;
    if (shopLogo) {
        shopLogo.src = getImageUrl(SHOP.logo);
        shopLogo.onerror = function () { handleImageError(this); };
    }
    document.title = SHOP.name;
}

function loadContactInfo() {
    const contactShopName = document.getElementById("contactShopName");
    const contactAddress = document.getElementById("contactAddress");
    const contactWhatsapp = document.getElementById("contactWhatsapp");
    const contactCall = document.getElementById("contactCall");
    const contactInstagram = document.getElementById("contactInstagram");

    if (contactShopName) contactShopName.textContent = SHOP.name;
    if (contactAddress) contactAddress.textContent = SHOP.address;
    if (contactWhatsapp) contactWhatsapp.href = `https://wa.me/${SHOP.whatsapp}`;
    if (contactCall) contactCall.href = `tel:${SHOP.phone}`;
    if (contactInstagram) contactInstagram.href = SHOP.instagram;
}

function loadFloatingWhatsapp() {
    const button = document.getElementById("floatingWhatsapp");
    if (button) button.href = `https://wa.me/${SHOP.whatsapp}`;
}

// ========================================
// CATEGORY COUNTS
// ========================================

function updateCategoryCounts() {
    const categories = ["All", "Rings", "Earrings", "Necklaces", "Bracelets"];

    categories.forEach(category => {
        const countElement = document.getElementById("count-" + category);
        if (!countElement) return;

        const count = category === "All"
            ? PRODUCTS.length
            : PRODUCTS.filter(product => product.category === category).length;

        countElement.textContent = " (" + count + ")";
    });
}

// ========================================
// PRODUCT MANAGER - ADD / EDIT / DELETE
// ========================================

function openProductManager() {
    const form = document.getElementById("productManagerForm");
    if (form) form.style.display = "block";
    resetProductForm();
    loadAdminProducts();
}

function closeProductManager() {
    const form = document.getElementById("productManagerForm");
    if (form) form.style.display = "none";
    resetProductForm();
}

function resetProductForm() {
    const fields = {
        name: document.getElementById("adminProductName"),
        price: document.getElementById("adminProductPrice"),
        category: document.getElementById("adminProductCategory"),
        description: document.getElementById("adminProductDescription"),
        image: document.getElementById("adminProductImage"),
        editing: document.getElementById("adminEditingProductId")
    };

    if (fields.name) fields.name.value = "";
    if (fields.price) fields.price.value = "";
    if (fields.category) fields.category.value = "ring";
    if (fields.description) fields.description.value = "";
    if (fields.image) fields.image.value = "";
    if (fields.editing) fields.editing.value = "";

    const saveButton = document.querySelector('#productManagerForm button[onclick="saveNewProduct()"]');
    if (saveButton) saveButton.textContent = "✅ Save Product";
}

async function saveNewProduct() {
    const nameInput = document.getElementById("adminProductName");
    const priceInput = document.getElementById("adminProductPrice");
    const categoryInput = document.getElementById("adminProductCategory");
    const descriptionInput = document.getElementById("adminProductDescription");
    const imageInput = document.getElementById("adminProductImage");
    const editingInput = document.getElementById("adminEditingProductId");

    const name = nameInput ? nameInput.value.trim() : "";
    const priceText = priceInput ? priceInput.value.trim() : "";
    const categoryMap = {
        ring: "Rings",
        necklace: "Necklaces",
        earring: "Earrings",
        bracelet: "Bracelets",
        other: "Other"
    };
    const category = categoryMap[categoryInput ? categoryInput.value : ""] || "Other";
    const description = descriptionInput ? descriptionInput.value.trim() : "";
    const editingId = editingInput ? editingInput.value : "";
    const price = Number(priceText.replace(/[^0-9.]/g, ""));

    if (!name || !priceText || !description) {
        alert("Please fill all product details.");
        return;
    }

    if (!Number.isFinite(price) || price < 0) {
        alert("Please enter a valid price.");
        return;
    }

    try {
        // ========================================
        // EDIT EXISTING PRODUCT
        // ========================================
        if (editingId) {
            const product = getProduct(editingId);
            if (!product) return;

            let imageUrl = product.image;

            // Upload a new image only when one was selected.
            if (imageInput && imageInput.files && imageInput.files[0]) {
                const imageFile = imageInput.files[0];
                const fileExt = imageFile.name.split(".").pop() || "jpg";
                const fileName =
                    "product-" + Date.now() + "-" +
                    Math.random().toString(36).slice(2, 8) +
                    "." + fileExt;

                const { error: uploadError } = await supabaseClient
                    .storage
                    .from("product-images")
                    .upload(fileName, imageFile, {
                        cacheControl: "3600",
                        upsert: false
                    });

                if (uploadError) {
                    console.error("Image upload error:", uploadError);
                    alert("Image upload failed: " + uploadError.message);
                    return;
                }

                const { data: publicUrlData } = supabaseClient
                    .storage
                    .from("product-images")
                    .getPublicUrl(fileName);

                imageUrl = publicUrlData.publicUrl;
            }

            // Default demo products exist only locally. Supabase products have numeric IDs.
            const supabaseId = Number(product.id);

            if (Number.isInteger(supabaseId)) {
                const { data, error } = await supabaseClient
                    .from("products")
                    .update({
                        name,
                        price,
                        category,
                        image: imageUrl,
                        description
                    })
                    .eq("id", supabaseId)
                    .select()
                    .single();

                if (error) {
                    console.error("Supabase update error:", error);
                    alert("Product update failed: " + error.message);
                    return;
                }

                product.name = data.name;
                product.price = Number(data.price);
                product.category = data.category;
                product.image = data.image;
                product.description = data.description;
            } else {
                product.name = name;
                product.price = price;
                product.category = category;
                product.image = imageUrl;
                product.description = description;
            }

            finishProductSave("Product updated successfully!");
            return;
        }

        // ========================================
        // ADD NEW PRODUCT
        // ========================================
        if (!imageInput || !imageInput.files || !imageInput.files[0]) {
            alert("Please select a product image.");
            return;
        }

        const imageFile = imageInput.files[0];
        const fileExt = imageFile.name.split(".").pop() || "jpg";
        const fileName =
            "product-" + Date.now() + "-" +
            Math.random().toString(36).slice(2, 8) +
            "." + fileExt;

        const { error: uploadError } = await supabaseClient
            .storage
            .from("product-images")
            .upload(fileName, imageFile, {
                cacheControl: "3600",
                upsert: false
            });

        if (uploadError) {
            console.error("Image upload error:", uploadError);
            alert("Image upload failed: " + uploadError.message);
            return;
        }

        const { data: publicUrlData } = supabaseClient
            .storage
            .from("product-images")
            .getPublicUrl(fileName);

        const imageUrl = publicUrlData.publicUrl;

        const { data, error } = await supabaseClient
            .from("products")
            .insert([{
                name,
                price,
                category,
                image: imageUrl,
                description
            }])
            .select()
            .single();

        if (error) {
            console.error("Supabase insert error:", error);
            alert("Product save failed: " + error.message);
            return;
        }

        PRODUCTS.push({
            id: String(data.id),
            name: data.name,
            price: Number(data.price),
            category: data.category,
            image: data.image,
            description: data.description
        });

        finishProductSave("Product saved successfully!");

    } catch (error) {
        console.error("Product save error:", error);
        alert("Something went wrong: " + error.message);
    }
}

function finishProductSave(message) {
    saveProducts();
    resetProductForm();
    displayProducts(PRODUCTS);
    displayWishlist();
    updateCategoryCounts();
    loadAdminProducts();
    alert("✅ " + message);
}

function editProduct(id) {
    const product = getProduct(id);
    if (!product) return;

    const form = document.getElementById("productManagerForm");
    const name = document.getElementById("adminProductName");
    const price = document.getElementById("adminProductPrice");
    const category = document.getElementById("adminProductCategory");
    const description = document.getElementById("adminProductDescription");
    const editing = document.getElementById("adminEditingProductId");
    const saveButton = document.querySelector('#productManagerForm button[onclick="saveNewProduct()"]');

    if (form) form.style.display = "block";
    if (name) name.value = product.name;
    if (price) price.value = product.price;
    if (description) description.value = product.description;
    if (editing) editing.value = product.id;

    const categoryMap = { Rings: "ring", Necklaces: "necklace", Earrings: "earring", Bracelets: "bracelet", Other: "other" };
    if (category) category.value = categoryMap[product.category] || "other";
    if (saveButton) saveButton.textContent = "💾 Update Product";

    form.scrollIntoView({ behavior: "smooth", block: "center" });
}

async function deleteProduct(id) {
    const product = getProduct(id);
    if (!product) return;

    const confirmed = confirm(`Delete "${product.name}"?`);
    if (!confirmed) return;

    // Supabase se delete
    const supabaseId = Number(product.id);

    if (Number.isInteger(supabaseId)) {

        const { error } = await supabaseClient
            .from("products")
            .delete()
            .eq("id", supabaseId);

        if (error) {
            console.error("Supabase delete error:", error);
            alert("Product Supabase se delete nahi hua.");
            return;
        }
    }

    // Local products se delete
    const index = PRODUCTS.findIndex(
        item => item.id === product.id
    );

    if (index !== -1) {
        PRODUCTS.splice(index, 1);
    }

    // Wishlist se bhi remove
    wishlist = wishlist.filter(
        item => item !== product.id
    );

    localStorage.setItem(
        WISHLIST_STORAGE_KEY,
        JSON.stringify(wishlist)
    );

    saveProducts();

    searchProducts();
    displayWishlist();
    updateCategoryCounts();
    loadAdminProducts();

    alert("✅ Product deleted successfully!");
}

function loadAdminProducts() {
    const container = document.getElementById("adminProductList");
    if (!container) return;

    container.innerHTML = "";

    if (PRODUCTS.length === 0) {
        container.innerHTML = "<p class=\"admin-empty\">No products available.</p>";
        return;
    }

    const title = document.createElement("h3");
    title.className = "admin-list-title";
    title.textContent = "Manage Products";
    container.appendChild(title);

    PRODUCTS.forEach(product => {
        const item = document.createElement("div");
        item.className = "admin-product-item";
        const imgSrc = getImageUrl(product.image);

        item.innerHTML = `
            <img src="${imgSrc}" alt="${escapeHtml(product.name)}" onerror="handleImageError(this)">
            <div class="admin-product-details">
                <strong>${escapeHtml(product.name)}</strong>
                <span>₹${product.price.toLocaleString("en-IN")} • ${escapeHtml(product.category)}</span>
            </div>
            <div class="admin-product-actions">
                <button class="admin-edit-btn" onclick="editProduct('${product.id}')">✏️ Edit</button>
                <button class="admin-delete-btn" onclick="deleteProduct('${product.id}')">🗑️ Delete</button>
            </div>
        `;

        container.appendChild(item);
    });
}

// ========================================
// START WEBSITE
// ========================================

function startWebsite() {
    loadShopInfo();
    loadContactInfo();
    loadFloatingWhatsapp();
    displayProducts(PRODUCTS);
    displayWishlist();
    updateCategoryCounts();
    loadAdminProducts();

    const modal = document.getElementById("productModal");
    if (modal) {
        modal.addEventListener("click", event => {
            if (event.target === modal) {
                closeProductModal();
            }
        });
    }

    const navMenu = document.getElementById("navMenu");
    if (navMenu) {
        navMenu.querySelectorAll("a").forEach(link => {
            link.addEventListener("click", () => {
                navMenu.classList.remove("active");
            });
        });
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startWebsite);
} else {
    startWebsite();
}

// Load products from Supabase after the local/default catalog is ready.
loadProductsFromSupabase().then(() => {
    displayProducts(PRODUCTS);
    displayWishlist();
    updateCategoryCounts();
    loadAdminProducts();
});


// ========================================
// ADMIN LOGIN - SUPABASE AUTH
// ========================================

async function adminLoginUser() {
  
    const email = document.getElementById("adminEmail").value.trim();
    const password = document.getElementById("adminPassword").value;

    if (!email || !password) {
        alert("Please enter email and password.");
        return;
    }

    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password
    });

    if (error) {
        console.error("Login error:", error);
        alert("Login failed: " + error.message);
        return;
    }

    alert("✅ Admin login successful!");

    showAdminPanel(data.session);
}

// ========================================
// UPDATE ADMIN PASSWORD
// ========================================

async function updateAdminPassword() {

    const newPassword =
        document.getElementById("newPassword").value;

    const confirmPassword =
        document.getElementById("confirmPassword").value;

    if (!newPassword || !confirmPassword) {
        alert("Please enter both passwords.");
        return;
    }

    if (newPassword !== confirmPassword) {
        alert("Passwords do not match.");
        return;
    }

    if (newPassword.length < 6) {
        alert("Password must be at least 6 characters.");
        return;
    }

    const { error } =
        await supabaseClient.auth.updateUser({
            password: newPassword
        });

    if (error) {
        console.error("Password update error:", error);
        alert("Password update failed: " + error.message);
        return;
    }

    alert("✅ Password updated successfully!");

    const resetBox =
        document.getElementById("resetPasswordBox");

    if (resetBox) {
        resetBox.style.display = "none";
    }

    document.getElementById("newPassword").value = "";
    document.getElementById("confirmPassword").value = "";

    isPasswordRecovery = false;

    await supabaseClient.auth.signOut();

    const loginBox =
        document.getElementById("adminLogin");

    if (loginBox) {
        loginBox.style.display = "block";
    }
}


// ========================================
// ADMIN AUTH + PASSWORD RECOVERY
// ========================================

let isPasswordRecovery = false;

function showResetPasswordBox() {
    const resetBox = document.getElementById("resetPasswordBox");
    const loginBox = document.getElementById("adminLogin");
    const adminSection = document.getElementById("admin");

    if (resetBox) resetBox.style.display = "block";
    if (loginBox) loginBox.style.display = "none";
    if (adminSection) adminSection.style.display = "none";
}

function showAdminPanel(session) {
    const loginBox = document.getElementById("adminLogin");
    const resetBox = document.getElementById("resetPasswordBox");
    const adminSection = document.getElementById("admin");

    if (isPasswordRecovery) {
        showResetPasswordBox();
        return;
    }

    if (session) {
        if (loginBox) loginBox.style.display = "none";
        if (resetBox) resetBox.style.display = "none";
        if (adminSection) adminSection.style.display = "block";
    } else {
        if (loginBox) loginBox.style.display = "block";
        if (resetBox) resetBox.style.display = "none";
        if (adminSection) adminSection.style.display = "none";
    }
}

function isRecoveryUrl() {
    const hash = window.location.hash || "";
    const search = window.location.search || "";
    return hash.includes("type=recovery") || search.includes("type=recovery");
}

async function checkAdminLogin() {
    if (isPasswordRecovery || isRecoveryUrl()) {
        isPasswordRecovery = true;
        showResetPasswordBox();
        return;
    }

    const { data } = await supabaseClient.auth.getSession();
    showAdminPanel(data.session);
}

supabaseClient.auth.onAuthStateChange((event, session) => {
    console.log("Auth event:", event);

    if (event === "PASSWORD_RECOVERY") {
        isPasswordRecovery = true;
        showResetPasswordBox();
        return;
    }

    if (event === "SIGNED_IN") {
        isPasswordRecovery = false;
        showAdminPanel(session);
    }

    if (event === "SIGNED_OUT") {
        isPasswordRecovery = false;
        showAdminPanel(null);
    }
});

document.addEventListener("DOMContentLoaded", checkAdminLogin);
