import { validateApiCredentials, getApiHealthStatus } from '../services/fallbackData.js';

/**
 * Diagnostic endpoint to check API health and credentials
 */
export const checkApiHealth = async (req, res) => {
  try {
    const { user } = req;

    const validation = validateApiCredentials(user);
    const healthStatus = await getApiHealthStatus(user);

    const response = {
      userId: user._id,
      timestamp: new Date().toISOString(),
      credentials: {
        isValid: validation.isValid,
        issues: validation.issues,
      },
      apiStatus: healthStatus,
      onboarding: {
        step2Complete: Boolean(user?.onboarding?.step2?.accessToken),
        step4Complete: Boolean(user?.onboarding?.step4?.accessToken),
        step5Complete: Boolean(user?.onboarding?.step5?.token),
      },
      recommendations: [],
    };

    // Add recommendations based on issues
    if (!validation.isValid) {
      response.recommendations.push('Complete onboarding to connect all platforms');
      validation.issues.forEach(issue => {
        if (issue.includes('Shopify')) {
          response.recommendations.push('Reconnect your Shopify store in Settings');
        }
        if (issue.includes('Meta')) {
          response.recommendations.push('Reconnect your Meta Ads account in Settings');
        }
        if (issue.includes('Shiprocket')) {
          response.recommendations.push('Update your Shiprocket token in Settings');
        }
      });
    }

    return res.status(200).json(response);
  } catch (error) {
    console.error('❌ Diagnostics error:', error.message);
    return res.status(500).json({
      error: 'Failed to run diagnostics',
      message: error.message,
    });
  }
};

export default { checkApiHealth };
