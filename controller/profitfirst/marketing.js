import axios from "axios";
import NodeCache from "node-cache";
import MetaCredential from "../../model/MetaCredential.js";

// In-memory cache with 5-minute TTL
const cache = new NodeCache({ stdTTL: 600 });

export const marketingData = async (req, res) => {
  const { startDate, endDate } = req.query;
  const formatteds = new Date(startDate).toISOString().split("T")[0];
  const formattede = new Date(endDate).toISOString().split("T")[0];

  // 🔧 Fixed Date Range in IST
  const toISTDate = (dateStr) => {
    const date = new Date(dateStr);
    const istOffset = 330 * 60 * 1000;
    const istDate = new Date(date.getTime() + istOffset);
    return istDate.toISOString().split("T")[0];
  };

  const formattedStart = toISTDate(formatteds);
  const formattedEnd = toISTDate(formattede);

  try {
    const user = req.user;
    const adAccountId = user.onboarding.step4.adAccountId;
    // Build cache key
    const cacheKey = `marketing|${adAccountId}|${formattedStart}|${formattedEnd}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.status(200).json(cached);
    }
    const metaCred = req.user.onboarding.step4.accessToken;

    if (!adAccountId || !metaCred) {
      return res
        .status(400)
        .json({ message: "Meta token not configured. Contact admin." });
    }
    const accessToken = metaCred;
    const url = `https://graph.facebook.com/v23.0/act_${adAccountId}/insights`;

    // Campaign-level data
    const params = {
      access_token: accessToken,
      time_range: JSON.stringify({
        since: formattedStart,
        until: formattedEnd,
      }),
      level: "campaign",
      fields:
        "campaign_id,spend,campaign_name,clicks,cpc,cpm,cpp,ctr,date_start,date_stop,frequency,inline_link_clicks,cost_per_unique_click,purchase_roas,website_purchase_roas,impressions,reach,action_values,actions",
    };

    let adsData = [];
    try {
      const response = await axios.get(url, { params });
      adsData = response.data.data || [];
    } catch (err) {
      console.error("Meta Ads Campaign Data Fetch Error:", {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
      });
      return res
        .status(500)
        .json({ error: "Failed to fetch campaign data from Meta Ads Manager" });
    }

    // Process campaigns
    const shortenName = (name) => name.split(" ").slice(0, 3).join(" ");
    const campaignData = adsData.reduce((acc, campaign) => {
      const nameKey = shortenName(campaign.campaign_name);
      const spend = parseFloat(campaign.spend) || 0;
      const impressions = parseInt(campaign.impressions) || 0;
      const clicks = parseInt(campaign.clicks) || 0;
      const cpc = parseFloat(campaign.cpc) || 0;
      const ctr = parseFloat(campaign.ctr) || 0;
      const reach = parseInt(campaign.reach) || 0;

      let salesCount = 0;
      let totalSales = 0;
      (campaign.actions || []).forEach((a) => {
        if (a.action_type === "purchase") salesCount += parseInt(a.value) || 0;
      });
      (campaign.action_values || []).forEach((a) => {
        if (a.action_type === "purchase")
          totalSales += parseFloat(a.value) || 0;
      });

      const costPerSale = salesCount ? (spend / salesCount).toFixed(2) : "0.00";
      const roas = spend ? (totalSales / spend).toFixed(2) : "0.00";

      acc[nameKey] = {
        amountSpent: spend.toFixed(2),
        impressions,
        linkClicks: clicks,
        costPerClick: cpc.toFixed(2),
        sales: salesCount,
        costPerSale,
        roas,
        ctr: ctr.toFixed(2),
        reach,
      };
      return acc;
    }, {});

    // Chart and table data
    const spendChartData = Object.entries(campaignData).map(([name, d]) => ({
      name,
      spend: parseFloat(d.amountSpent),
      cpp: (parseFloat(d.costPerClick) * 1000).toFixed(2),
      roas: parseFloat(d.roas),
    }));
    const adsChartData = Object.entries(campaignData).map(([name, d]) => ({
      name,
      value: parseFloat(d.roas),
    }));
    const analysisTable = Object.entries(campaignData).map(([name, d]) => ({
      name,
      spend: parseFloat(d.amountSpent),
      cpp: parseFloat(d.costPerClick),
      roas: parseFloat(d.roas),
    }));

    // Overall metrics
    const overallParams = {
      access_token: accessToken,
      time_range: JSON.stringify({
        since: formattedStart,
        until: formattedEnd,
      }),
      fields:
        "spend,impressions,cpm,ctr,clicks,cpc,website_purchase_roas,action_values,actions,purchase_roas",
    };

    let overallData = {};
    try {
      const response = await axios.get(url, { params: overallParams });
      overallData = (response.data.data || [])[0] || {};
    } catch (err) {
      console.error("Meta Ads Overall Data Fetch Error:", err.message);
      return res
        .status(500)
        .json({ error: "Failed to fetch overall data from Meta Ads Manager" });
    }

    const totalSpend = parseFloat(overallData.spend) || 0;
    const totalImpr = parseInt(overallData.impressions) || 0;
    const totalClicks = parseInt(overallData.clicks) || 0;
    const avgCPC = totalClicks ? (totalSpend / totalClicks).toFixed(2) : "0.00";
    const totalSales =
      parseFloat(
        (overallData.action_values || []).find(
          (a) => a.action_type === "purchase"
        )?.value
      ) || 0;
    const saleCount =
      parseInt(
        (overallData.actions || []).find((a) => a.action_type === "purchase")
          ?.value
      ) || 0;
    const avgCPS = saleCount ? (totalSpend / saleCount).toFixed(2) : "0.00";
    const roasVal = totalSpend ? (totalSales / totalSpend).toFixed(2) : "0.00";

    const summary = [
      ["Amount Spend", `₹${totalSpend.toLocaleString()}`],
      ["Impression", totalImpr.toLocaleString()],
      ["CPM", `₹${((totalSpend / totalImpr) * 1000).toFixed(2)}`],
      ["CTR", `${((totalClicks / totalImpr) * 100).toFixed(2)}%`],
      ["Clicks", totalClicks.toLocaleString()],
      ["CPC", `₹${avgCPC}`],
      ["Sales", saleCount.toLocaleString()],
      ["CPS", `₹${avgCPS}`],
      ["ROAS", roasVal],
      ["Total Sales", `₹${totalSales.toLocaleString()}`],
    ];

    const result = {
      summary,
      campaignMetrics: campaignData,
      spendChartData,
      adsChartData,
      analysisTable,
    };

    // Cache and return
    cache.set(cacheKey, result);
    return res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching marketing data:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
