import express from 'express';
import {
    currentStep,
    onboardStep1,
    onboardStep2,
    onboardStep4,
    onboardStep5,
    fetchproduct,
    manufacture,
    Shopifyhelper,
    facebookLogin,
    facebookAccesstoken,
    adsAccountslist,
  } from "../controller/onboarding/onboarding.js";
import auth from '../middleware/auth.js';

const router = express.Router();

router.get('/step',auth,currentStep);
router.post('/step1',auth,onboardStep1);
router.post('/step2',auth,onboardStep2);

router.get('/proxy/token',auth,Shopifyhelper);

router.get('/fetchproduct',auth,fetchproduct);
router.post('/modifyprice',auth,manufacture);

 
// meta connnect
router.get('/login',auth,facebookLogin);
router.get('/auth/callback',facebookAccesstoken);
router.get('/ad-accounts',adsAccountslist);
router.post('/step4',auth,onboardStep4);

router.post('/step5',auth,onboardStep5);

export default router;