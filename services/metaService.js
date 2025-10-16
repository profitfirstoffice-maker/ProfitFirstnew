import axios from 'axios';
import axiosRetry from 'axios-retry';
import { eachDayOfInterval, parseISO } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';

const META_API_VERSION = 'v23.0';
const IST_TIMEZONE = 'Asia/Kolkata';

const metaApiClient = axios.create({
  baseURL: `https://graph.facebook.com/${META_API_VERSION}`,
  timeout: 15000
});

axiosRetry(metaApiClient, {
  retries: 3,
  retryDelay: (count) => count * 2000,
  retryCondition: (err) => axiosRetry.isNetworkError(err) || err.response?.status >= 500
});

const toISTDate = (dateStr) => {
  const date = new Date(dateStr);
  const istOffset = 330 * 60 * 1000;
  const istDate = new Date(date.getTime() + istOffset);
  return istDate.toISOString().split('T')[0];
};

const toISTLabel = (date) => formatInTimeZone(date, IST_TIMEZONE, 'MMM d');

const toNum = (v) => {
  if (v === null || v === undefined) return 0;
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  if (typeof v === 'string') {
    const cleaned = v.trim().replace(/,/g, '');
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
};

export const fetchMetaOverview = async (apiToken, adAccountId, startDate, endDate) => {
  const def = {
    spend: 0,
    impressions: 0,
    clicks: 0,
    ctr: 0,
    cpc: 0,
    cpm: 0,
    reach: 0,
    purchase_roas: 0
  };

  if (!apiToken || !adAccountId) return def;

  try {
    const formattedStart = toISTDate(startDate);
    const formattedEnd = toISTDate(endDate);

    const url = `/act_${adAccountId}/insights`;
    const params = {
      access_token: apiToken,
      time_range: JSON.stringify({ since: formattedStart, until: formattedEnd }),
      fields: 'spend,impressions,cpm,ctr,clicks,cpc,reach,purchase_roas'
    };

    const { data } = await metaApiClient.get(url, { params });
    const insight = data?.data?.[0];
    if (!insight) return def;

    return {
      spend: parseFloat(insight.spend || 0),
      impressions: parseInt(insight.impressions || 0, 10),
      clicks: parseInt(insight.clicks || 0, 10),
      ctr: parseFloat(insight.ctr || 0),
      cpc: parseFloat(insight.cpc || 0),
      cpm: parseFloat(insight.cpm || 0),
      reach: parseInt(insight.reach || 0, 10),
      purchase_roas: insight.purchase_roas ? parseFloat(insight.purchase_roas[0]?.value || 0) : 0
    };
  } catch (err) {
    console.error('Meta Overview Error:', err.message);
    return def;
  }
};

export const fetchMetaDaily = async (apiToken, adAccountId, startDate, endDate) => {
  if (!apiToken || !adAccountId) return [];

  const formattedStart = toISTDate(startDate);
  const formattedEnd = toISTDate(endDate);

  const interval = eachDayOfInterval({
    start: parseISO(startDate),
    end: parseISO(endDate)
  });

  const template = interval.map(d => ({
    name: toISTLabel(d),
    reach: 0,
    spend: 0,
    roas: 0,
    linkClicks: 0,
    impressions: 0,
    ctr: 0,
    cpc: 0,
    cpm: 0
  }));

  try {
    const url = `/act_${adAccountId}/insights`;
    const params = {
      access_token: apiToken,
      time_range: JSON.stringify({ since: formattedStart, until: formattedEnd }),
      fields: 'spend,purchase_roas,clicks,impressions,reach,ctr,cpc,cpm',
      time_increment: 1
    };

    const { data } = await metaApiClient.get(url, { params });

    const map = new Map();
    for (const ins of data?.data || []) {
      const name = toISTLabel(ins.date_start);
      map.set(name, {
        name,
        reach: toNum(ins.reach),
        spend: toNum(ins.spend),
        roas: ins.purchase_roas ? toNum(ins.purchase_roas[0]?.value) : 0,
        linkClicks: toNum(ins.clicks),
        impressions: toNum(ins.impressions),
        ctr: toNum(ins.ctr),
        cpc: toNum(ins.cpc),
        cpm: toNum(ins.cpm)
      });
    }

    return template.map(d => map.get(d.name) || d);
  } catch (err) {
    console.error('Meta Daily Error:', err.message);
    return template;
  }
};
