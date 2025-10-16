import axios from "axios";
import ProductCost from "../../model/ProductCost.js";

export async function getProductsWithCosts(req, res) {
  const { accessToken, storeUrl } = req.user.onboarding.step2;
  const userId = req.user._id;

  if (!accessToken || !storeUrl) {
    return res.status(400).json({ message: "Shopify credentials not found." });
  }

  let allShopifyProducts = [];
  let nextPageUrl = `https://${storeUrl}/admin/api/2025-04/products.json?limit=250`;

  try {
    while (nextPageUrl) {
      const productRes = await axios.get(nextPageUrl, {
        headers: { "X-Shopify-Access-Token": accessToken }, 
      });

      const products = productRes.data.products;
      const simplifiedProducts = products.map((product) => ({
        id: product.id.toString(),
        title: product.title,
        price: product.variants?.[0]?.price || "0.00",
        image: product.image?.src || null,
      }));

      allShopifyProducts.push(...simplifiedProducts);

      const linkHeader = productRes.headers["link"];
      if (linkHeader?.includes('rel="next"')) {
        const match = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
        nextPageUrl = match ? match[1] : null;
      } else {
        nextPageUrl = null;
      }
    }
    const userCostsData = await ProductCost.findOne({ userId });
    const costsMap = new Map();
    if (userCostsData) {
      userCostsData.products.forEach((p) => {
        costsMap.set(p.productId.toString(), p.cost);
      });
    }
    const mergedProducts = allShopifyProducts.map((product) => ({
      ...product,
      cost: costsMap.get(product.id) || null,
    }));

    res.status(200).json(mergedProducts);
  } catch (error) {
    console.error(
      "Error fetching products with costs:",
      error.response?.data || error.message
    );
    res.status(500).json({ message: "Failed to fetch products with costs" });
  }
}

export async function updateProductCosts(req, res) {
  const updates = req.body;
  const userId = req.user._id;

  if (!Array.isArray(updates) || updates.length === 0) {
    return res.status(400).json({ message: "Invalid update data provided." });
  }

  try {
    let userCosts = await ProductCost.findOne({ userId });

    if (!userCosts) {
      userCosts = new ProductCost({
        userId,
        products: updates.map(({ productId, cost }) => ({
          productId,
          cost,
        })),
      });
    } else {
      updates.forEach(({ productId, cost }) => {
        const existingProduct = userCosts.products.find(
          (p) => p.productId.toString() === productId.toString()
        );

        if (existingProduct) {
          existingProduct.cost = cost;
          existingProduct.updatedAt = new Date();
        } else {
          userCosts.products.push({ productId, cost, updatedAt: new Date() });
        }
      });
    }

    await userCosts.save();

    res.status(200).json({ message: "Costs updated successfully" });
  } catch (err) {
    console.error("Error in updateProductCosts:", err);
    res.status(500).json({ message: "Failed to update costs on the server" });
  }
}

export default { getProductsWithCosts, updateProductCosts };
