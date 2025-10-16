import express from 'express';
import authRoute from './authroute.js';
import profitroute from './profitroute.js';
import onboardRoute from './onboarding.js';
import adminRoute from './adminRoutes.js';
import getInTouchController from '../controller/getInTouchController.js';
import { getAllBlogs, createBlog } from '../controller/blogController.js';
import settingRoute from "./settingRoute.js";

const router = express.Router();

//contact us route
router.post('/getInTouch',getInTouchController);
router.get('/blogs',getAllBlogs);
router.post('/blogs/create',createBlog);
router.use('/auth',authRoute);
router.use('/onboard',onboardRoute);
router.use('/data',profitroute);
router.use('/user',settingRoute)
router.use("/admin", adminRoute);



export default router;
