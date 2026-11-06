import prisma from "../config/prisma.js";
import { hashPassword } from "../utils/password.js";
import sharp from "sharp";
import fs from "fs";
import path from "path";
import { gender_type } from "@prisma/client";

// Helper fungsi untuk mengompres dan menyalin gambar ke public/img/products
async function compressAndSave(sourceFileName: string, outputSlug: string): Promise<string> {
  const rootImgPath = path.resolve(process.cwd(), "..", "img", sourceFileName);
  const localImgPath = path.resolve(process.cwd(), "img", sourceFileName);
  const sourcePath = fs.existsSync(rootImgPath) ? rootImgPath : localImgPath;

  const targetDir = path.resolve(process.cwd(), "public", "img", "products");
  const targetFileName = `product-${outputSlug}.webp`;
  const targetPath = path.join(targetDir, targetFileName);

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  if (fs.existsSync(sourcePath)) {
    await sharp(sourcePath)
      .resize(1000, 1000, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 80 })
      .toFile(targetPath);
    console.log(`   📸 Compressed & saved: ${targetFileName}`);
  } else {
    console.warn(`   ⚠️ Gambar sumber tidak ditemukan: ${sourcePath}`);
  }

  return `/uploads/products/${targetFileName}`;
}

async function seed() {
  console.log("🌱 Starting Database Seeding with 25 Products & Image Compression...");

  // 1. Seed Categories
  console.log("--> 1. Seeding Categories...");
  const categories = [
    { name: "Sneakers", slug: "sneakers" },
    { name: "Boots", slug: "boots" },
    { name: "Athletic", slug: "athletic" },
    { name: "Formal", slug: "formal" },
    { name: "High Heels & Flats", slug: "heels-flats" },
  ];

  for (const cat of categories) {
    await prisma.categories.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name },
      create: { name: cat.name, slug: cat.slug },
    });
  }

  const catRes = await prisma.categories.findMany({
    select: { id: true, slug: true },
  });
  const catMap = new Map<string, number>();
  catRes.forEach((r) => catMap.set(r.slug, r.id));

  // 2. Seed Users
  console.log("--> 2. Seeding Users...");
  const adminPass = await hashPassword("Admin123!");
  const userPass = await hashPassword("User123!");

  await prisma.users.upsert({
    where: { email: "admin@nexa.com" },
    update: {},
    create: {
      name: "Nexa Admin",
      email: "admin@nexa.com",
      password: adminPass,
      role: "admin",
      phone: "08123456789",
    },
  });

  const demoCustomer = await prisma.users.upsert({
    where: { email: "customer@nexa.com" },
    update: {},
    create: {
      name: "Customer Demo",
      email: "customer@nexa.com",
      password: userPass,
      role: "user",
      phone: "08987654321",
    },
  });

  // Buat default cart untuk customer demo jika belum ada
  await prisma.carts.upsert({
    where: { user_id: demoCustomer.id },
    update: {},
    create: { user_id: demoCustomer.id },
  });

  // 3. 25 Products Data (Menggunakan gambar dari folder img/ luar)
  console.log("--> 3. Seeding 25 Products & Variants with Compressed WebP Images...");
  const rawProducts = [
    // --- SNEAKERS (5 Produk) ---
    {
      categorySlug: "sneakers",
      sku: "SNK-LOW-01",
      name: "Classic Street Low Top",
      slug: "classic-street-low-top",
      gender: "unisex",
      description: "Low top streetwear sneaker with vulcanized rubber sole and breathable canvas.",
      price: 650000,
      imageSource: "sneakers-low-top.jpg",
      variants: [
        { size: "39", stock: 12 },
        { size: "40", stock: 15 },
        { size: "41", stock: 20 },
        { size: "42", stock: 25 },
        { size: "43", stock: 10 },
      ],
    },
    {
      categorySlug: "sneakers",
      sku: "SNK-HIGH-02",
      name: "Retro High Top Runner",
      slug: "retro-high-top-runner",
      gender: "men",
      description: "Vintage inspired silhouette high top with premium leather upper.",
      price: 890000,
      imageSource: "sneakers-high-top.jpg",
      variants: [
        { size: "40", stock: 10 },
        { size: "41", stock: 12 },
        { size: "42", stock: 18 },
        { size: "43", stock: 14 },
      ],
    },
    {
      categorySlug: "sneakers",
      sku: "SNK-SLIP-03",
      name: "Urban Slip-On Minimalist",
      slug: "urban-slip-on-minimalist",
      gender: "unisex",
      description: "Easy-to-wear everyday slip on sneaker with padded collar and cushion insole.",
      price: 520000,
      imageSource: "sneakers-slip-on.jpg",
      variants: [
        { size: "38", stock: 8 },
        { size: "39", stock: 10 },
        { size: "40", stock: 15 },
        { size: "41", stock: 20 },
      ],
    },
    {
      categorySlug: "sneakers",
      sku: "SNK-RETRO-04",
      name: "Nexa Court Vision Low",
      slug: "nexa-court-vision-low",
      gender: "men",
      description: "Sporty court classic shoes engineered for daily streetwear comfort and traction.",
      price: 750000,
      imageSource: "snk1.jpg",
      variants: [
        { size: "40", stock: 14 },
        { size: "41", stock: 18 },
        { size: "42", stock: 16 },
      ],
    },
    {
      categorySlug: "sneakers",
      sku: "SNK-STREET-05",
      name: "Starlight Chunky Trainer",
      slug: "starlight-chunky-trainer",
      gender: "women",
      description: "Bold chunky outsole design with multilayer leather and mesh elements.",
      price: 820000,
      imageSource: "snk2.jpg",
      variants: [
        { size: "36", stock: 8 },
        { size: "37", stock: 12 },
        { size: "38", stock: 15 },
        { size: "39", stock: 10 },
      ],
    },

    // --- BOOTS (6 Produk) ---
    {
      categorySlug: "boots",
      sku: "BOT-CHEL-M-06",
      name: "Heritage Chelsea Boots Men",
      slug: "heritage-chelsea-boots-men",
      gender: "men",
      description: "Classic Chelsea boots crafted from hand-finished genuine pull-up leather.",
      price: 1250000,
      imageSource: "boots-chelsea-men.jpg",
      variants: [
        { size: "40", stock: 8 },
        { size: "41", stock: 15 },
        { size: "42", stock: 12 },
        { size: "43", stock: 6 },
      ],
    },
    {
      categorySlug: "boots",
      sku: "BOT-CHEL-W-07",
      name: "Sleek Chelsea Ankle Boots Women",
      slug: "sleek-chelsea-ankle-boots-women",
      gender: "women",
      description: "Refined pointed Chelsea boots with elastic gussets and low stacked heel.",
      price: 1100000,
      imageSource: "boots-chelsea-woman.jpg",
      variants: [
        { size: "36", stock: 6 },
        { size: "37", stock: 10 },
        { size: "38", stock: 14 },
        { size: "39", stock: 8 },
      ],
    },
    {
      categorySlug: "boots",
      sku: "BOT-CHK-M-08",
      name: "Desert Chukka Suede Men",
      slug: "desert-chukka-suede-men",
      gender: "men",
      description: "Casual two-eyelet suede chukka boots with durable crepe-textured rubber sole.",
      price: 980000,
      imageSource: "boots-chukka-man.jpg",
      variants: [
        { size: "40", stock: 10 },
        { size: "41", stock: 12 },
        { size: "42", stock: 14 },
      ],
    },
    {
      categorySlug: "boots",
      sku: "BOT-CHK-W-09",
      name: "Mid-Ankle Chukka Boots Women",
      slug: "mid-ankle-chukka-boots-women",
      gender: "women",
      description: "Comfortable mid-ankle chukka boots featuring soft microfiber lining.",
      price: 920000,
      imageSource: "boots-chukka-woman.jpg",
      variants: [
        { size: "36", stock: 5 },
        { size: "37", stock: 8 },
        { size: "38", stock: 12 },
      ],
    },
    {
      categorySlug: "boots",
      sku: "BOT-WRK-M-10",
      name: "Heavy-Duty Work Boots Men",
      slug: "heavy-duty-work-boots-men",
      gender: "men",
      description: "Rugged waterproof work boots equipped with lugged non-slip outsole.",
      price: 1350000,
      imageSource: "boots-work-man.jpg",
      variants: [
        { size: "41", stock: 10 },
        { size: "42", stock: 16 },
        { size: "43", stock: 12 },
      ],
    },
    {
      categorySlug: "boots",
      sku: "BOT-WRK-W-11",
      name: "Tough Combat Work Boots Women",
      slug: "tough-combat-work-boots-women",
      gender: "women",
      description: "Edgy lace-up combat boots with side zipper and cushioned collar.",
      price: 1180000,
      imageSource: "boots-work-woman.jpg",
      variants: [
        { size: "37", stock: 8 },
        { size: "38", stock: 14 },
        { size: "39", stock: 10 },
      ],
    },

    // --- ATHLETIC (6 Produk) ---
    {
      categorySlug: "athletic",
      sku: "ATH-RUN-M-12",
      name: "Pro Speed Carbon Runner Men",
      slug: "pro-speed-carbon-runner-men",
      gender: "men",
      description: "High-performance marathon running shoes with embedded carbon plate.",
      price: 1550000,
      imageSource: "running-man.jpg",
      variants: [
        { size: "40", stock: 10 },
        { size: "41", stock: 16 },
        { size: "42", stock: 20 },
        { size: "43", stock: 8 },
      ],
    },
    {
      categorySlug: "athletic",
      sku: "ATH-RUN-W-13",
      name: "Aeroflow Cloud Runner Women",
      slug: "aeroflow-cloud-runner-women",
      gender: "women",
      description: "Featherlight running sneakers engineered for superior shock absorption.",
      price: 1420000,
      imageSource: "runnig-woman.jpg",
      variants: [
        { size: "36", stock: 6 },
        { size: "37", stock: 12 },
        { size: "38", stock: 18 },
        { size: "39", stock: 10 },
      ],
    },
    {
      categorySlug: "athletic",
      sku: "ATH-BSK-M-14",
      name: "Air Pivot Basketball High Men",
      slug: "air-pivot-basketball-high-men",
      gender: "men",
      description: "Reinforced ankle support high-top basketball shoes with herringbone grip.",
      price: 1390000,
      imageSource: "basket-man.jpg",
      variants: [
        { size: "41", stock: 10 },
        { size: "42", stock: 15 },
        { size: "43", stock: 12 },
        { size: "44", stock: 6 },
      ],
    },
    {
      categorySlug: "athletic",
      sku: "ATH-BSK-W-15",
      name: "Fastbreak Basketball Shoes Women",
      slug: "fastbreak-basketball-shoes-women",
      gender: "women",
      description: "Agile court sneakers designed for quick cuts and responsive cushioning.",
      price: 1290000,
      imageSource: "basket-woman.jpg",
      variants: [
        { size: "37", stock: 8 },
        { size: "38", stock: 14 },
        { size: "39", stock: 10 },
      ],
    },
    {
      categorySlug: "athletic",
      sku: "ATH-GYM-M-16",
      name: "Powerlift Gym Trainer Men",
      slug: "powerlift-gym-trainer-men",
      gender: "men",
      description: "Stable flat sole workout shoes built for heavy squats and cross training.",
      price: 880000,
      imageSource: "gym-man.jpg",
      variants: [
        { size: "40", stock: 12 },
        { size: "41", stock: 18 },
        { size: "42", stock: 14 },
      ],
    },
    {
      categorySlug: "athletic",
      sku: "ATH-GYM-W-17",
      name: "Flex Matrix Workout Shoes Women",
      slug: "flex-matrix-workout-shoes-women",
      gender: "women",
      description: "Flexible studio workout shoes with supportive midfoot strap.",
      price: 790000,
      imageSource: "gym-woman.jpg",
      variants: [
        { size: "36", stock: 8 },
        { size: "37", stock: 15 },
        { size: "38", stock: 12 },
      ],
    },

    // --- FORMAL (4 Produk) ---
    {
      categorySlug: "formal",
      sku: "FRM-OXF-18",
      name: "Heritage Oxford Cap-Toe",
      slug: "heritage-oxford-cap-toe",
      gender: "men",
      description: "Handcrafted full-grain leather oxford with Goodyear welt construction.",
      price: 1450000,
      imageSource: "formal-oxford.jpg",
      variants: [
        { size: "40", stock: 8 },
        { size: "41", stock: 12 },
        { size: "42", stock: 10 },
      ],
    },
    {
      categorySlug: "formal",
      sku: "FRM-DRB-19",
      name: "Classic Derby Blucher",
      slug: "classic-derby-blucher",
      gender: "men",
      description: "Open-laced formal derby shoe made from polished calfskin leather.",
      price: 1350000,
      imageSource: "formal-derby.jpg",
      variants: [
        { size: "40", stock: 6 },
        { size: "41", stock: 10 },
        { size: "42", stock: 8 },
      ],
    },
    {
      categorySlug: "formal",
      sku: "FRM-LOA-20",
      name: "Penny Loafers Hand-Stitched",
      slug: "penny-loafers-hand-stitched",
      gender: "men",
      description: "Timeless slip-on penny loafers in polished leather with moc-toe detailing.",
      price: 1250000,
      imageSource: "formal-loafers.JPG",
      variants: [
        { size: "40", stock: 10 },
        { size: "41", stock: 15 },
        { size: "42", stock: 12 },
      ],
    },
    {
      categorySlug: "formal",
      sku: "FRM-MONK-21",
      name: "Double Monk Strap Formal",
      slug: "double-monk-strap-formal",
      gender: "men",
      description: "Sophisticated double buckle monk shoe in rich burnished brown finish.",
      price: 1500000,
      imageSource: "category-oxford.png",
      variants: [
        { size: "40", stock: 8 },
        { size: "41", stock: 11 },
        { size: "42", stock: 9 },
      ],
    },

    // --- HIGH HEELS & FLATS (4 Produk) ---
    {
      categorySlug: "heels-flats",
      sku: "HLS-STIL-22",
      name: "Elegance Stiletto High Heels",
      slug: "elegance-stiletto-high-heels",
      gender: "women",
      description: "Graceful 8cm stiletto pumps with pointed toe and comfortable padded footbed.",
      price: 890000,
      imageSource: "high-heels.jpg",
      variants: [
        { size: "36", stock: 6 },
        { size: "37", stock: 12 },
        { size: "38", stock: 14 },
      ],
    },
    {
      categorySlug: "heels-flats",
      sku: "HLS-WDG-23",
      name: "Casual Comfort Wedge",
      slug: "casual-comfort-wedge",
      gender: "women",
      description: "Espadrille-style wedge sandals offering all-day stability and summer style.",
      price: 680000,
      imageSource: "wedge.jpg",
      variants: [
        { size: "36", stock: 8 },
        { size: "37", stock: 10 },
        { size: "38", stock: 10 },
      ],
    },
    {
      categorySlug: "heels-flats",
      sku: "FLT-CAS-M-24",
      name: "Casual Flat Slip Shoes Men",
      slug: "casual-flat-slip-shoes-men",
      gender: "men",
      description: "Comfort-first canvas flat shoes ideal for weekend leisure and casual walks.",
      price: 450000,
      imageSource: "flat-man.jpg",
      variants: [
        { size: "40", stock: 12 },
        { size: "41", stock: 15 },
        { size: "42", stock: 12 },
      ],
    },
    {
      categorySlug: "heels-flats",
      sku: "FLT-BAL-W-25",
      name: "Classic Ballet Flats Women",
      slug: "classic-ballet-flats-women",
      gender: "women",
      description: "Ultra-flexible soft leather ballet flats with round toe and bow detail.",
      price: 420000,
      imageSource: "flat-woman.jpg",
      variants: [
        { size: "36", stock: 10 },
        { size: "37", stock: 14 },
        { size: "38", stock: 12 },
      ],
    },
  ];

  for (const p of rawProducts) {
    const categoryId = catMap.get(p.categorySlug) || 1;
    const compressedImgUrl = await compressAndSave(p.imageSource, p.slug);

    const product = await prisma.products.upsert({
      where: { sku: p.sku },
      update: {
        name: p.name,
        slug: p.slug,
        gender: p.gender as gender_type,
        price: p.price,
        img_url: compressedImgUrl,
        description: p.description,
        category_id: categoryId,
      },
      create: {
        category_id: categoryId,
        sku: p.sku,
        name: p.name,
        slug: p.slug,
        gender: p.gender as gender_type,
        description: p.description,
        price: p.price,
        img_url: compressedImgUrl,
      },
      select: { id: true },
    });

    for (const v of p.variants) {
      const existingVariant = await prisma.product_variants.findFirst({
        where: { product_id: product.id, size: v.size },
      });
      if (existingVariant) {
        await prisma.product_variants.update({
          where: { id: existingVariant.id },
          data: { stock: v.stock },
        });
      } else {
        await prisma.product_variants.create({
          data: {
            product_id: product.id,
            size: v.size,
            stock: v.stock,
          },
        });
      }
    }
  }

  console.log("✅ Berhasil: 25 Produk beserta Varian dan Gambar WebP terkompresi telah masuk ke database!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
