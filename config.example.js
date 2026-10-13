// ========================================
// WHITE-LABEL CLIENT CONFIGURATION TEMPLATE
// ========================================
// Instructions for new clients: 
// 1. Rename this file to config.js
// 2. Fill in your Supabase credentials and shop details below.

const CLIENT_CONFIG = {
    // Supabase Credentials (Get this from your Supabase Project Settings > API)
    SUPABASE_URL: "YOUR_SUPABASE_PROJECT_URL_HERE",
    SUPABASE_PUBLISHABLE_KEY: "YOUR_SUPABASE_ANON_KEY_HERE",

    // Shop Branding & Details
    shopName: "Your Brand Name",
    tagline: "Your Catchy Tagline Here",
    whatsappNumber: "919876543210", // Without '+' sign, include country code
    phoneNumber: "9876543210",
    instagramUrl: "https://instagram.com/yourbrand",
    shopAddress: "Your Full Store Address Here",
    logoPath: "" // Leave blank to use default bucket logo, or paste custom image URL
};
