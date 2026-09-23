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
{
    localStorage.setItem(PRODUCT_STORAGE_KEY, JSON.stringify(PRODUCTS));
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
        const index = PRODUCTS.findIndex(item => item.id === product.id);

        card.innerHTML = `
            <div class="product-image">
                <img src="${product.image}" alt="${escapeHtml(product.name)}" onclick="openProductModal('${product.id}')">
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
        .replace(/\"/g, "&quot;")
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

    if (image) image.src = product.image;
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

        card.innerHTML = `
            <div class="product-image">
                <img src="${product.image}" alt="${escapeHtml(product.name)}" onclick="openProductModal('${product.id}')">
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

// ========================================
// SHOP / CONTACT INFO
// ========================================

function loadShopInfo() {
    const shopName = document.getElementById("shopName");
    const shopLogo = document.getElementById("shopLogo");

    if (shopName) shopName.textContent = SHOP.name;
    if (shopLogo) shopLogo.src = SHOP.logo;
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

function saveNewProduct() {
    const nameInput = document.getElementById("adminProductName");
    const priceInput = document.getElementById("adminProductPrice");
    const categoryInput = document.getElementById("adminProductCategory");
    const descriptionInput = document.getElementById("adminProductDescription");
    const imageInput = document.getElementById("adminProductImage");
    const editingInput = document.getElementById("adminEditingProductId");

    const name = nameInput.value.trim();
    const priceText = priceInput.value.trim();
    const categoryMap = { ring: "Rings", necklace: "Necklaces", earring: "Earrings", bracelet: "Bracelets", other: "Other" };
    const category = categoryMap[categoryInput.value] || categoryInput.value;
    const description = descriptionInput.value.trim();
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

    if (editingId) {
        const product = getProduct(editingId);
        if (!product) return;

        product.name = name;
        product.price = price;
        product.category = category;
        product.description = description;

        if (imageInput.files && imageInput.files[0]) {
            const reader = new FileReader();
            reader.onload = event => {
                product.image = event.target.result;
                finishProductSave("Product updated successfully!");
            };
            reader.readAsDataURL(imageInput.files[0]);
            return;
        }

        finishProductSave("Product updated successfully!");
        return;
    }

    if (!imageInput.files || !imageInput.files[0]) {
        alert("Please select a product image.");
        return;
    }

    const reader = new FileReader();

reader.onload = async event => {

    const newProduct = {
        id: "product-" + Date.now() + "-" +
            Math.random().toString(36).slice(2, 8),
        name,
        price,
        category,
        description,
        image: event.target.result
    };

    // Save locally
    PRODUCTS.push(newProduct);
    saveProducts();

    // Save to Supabase
    const { data, error } = await supabaseClient
        .from("products")
        .insert([{
            name: name,
            price: price,
            category: category,
            image: event.target.result,
            description: description
        }])
        .select()
        .single();

    if (error) {
        console.error("Supabase insert error:", error);
        alert("Product local mein save hua, lekin Supabase mein save nahi hua.");
        return;
    }

    console.log("Product saved to Supabase:", data);

    finishProductSave("Product saved successfully!");
};

reader.readAsDataURL(imageInput.files[0]);
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

function deleteProduct(id) {
    const product = getProduct(id);
    if (!product) return;

    const confirmed = confirm(`Delete "${product.name}"?`);
    if (!confirmed) return;

    const index = PRODUCTS.findIndex(item => item.id === product.id);
    if (index === -1) return;

    PRODUCTS.splice(index, 1);
    wishlist = wishlist.filter(item => item !== product.id);
    localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(wishlist));

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

        item.innerHTML = `
            <img src="${product.image}" alt="${escapeHtml(product.name)}">
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
    displayProducts();
    displayWishlist();
    updateCategoryCounts();
    loadAdminProducts();

    const modal = document.getElementById("productModal");
    if (modal) {
        modal.addEventListener("click", event => {
            if (event.target === modal) closeProductModal();
        });
    }

    const navMenu = document.getElementById("navMenu");
    if (navMenu) {
        navMenu.querySelectorAll("a").forEach(link => {
            link.addEventListener("click", () => navMenu.classList.remove("active"));
        });
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startWebsite);
} else {
    startWebsite();
}
          // Load products from Supabase
        loadProductsFromSupabase().then(() => {
            displayProducts(PRODUCTS);
            updateCategoryCounts();
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

    const loginBox = document.getElementById("adminLogin");
    const adminSection = document.getElementById("admin");

    if (loginBox) {
        loginBox.style.display = "none";
    }

    if (adminSection) {
        adminSection.style.display = "block";
    }
}


// Check login when website opens
async function checkAdminLogin() {

    const { data } = await supabaseClient.auth.getSession();

    const loginBox = document.getElementById("adminLogin");
    const adminSection = document.getElementById("admin");

    if (data.session) {

        if (loginBox) {
            loginBox.style.display = "none";
        }

        if (adminSection) {
            adminSection.style.display = "block";
        }

    } else {

        if (loginBox) {
            loginBox.style.display = "block";
        }

        if (adminSection) {
            adminSection.style.display = "none";
        }
    }
}

document.addEventListener("DOMContentLoaded", function () {
    checkAdminLogin();
});