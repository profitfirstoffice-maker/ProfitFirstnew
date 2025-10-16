import express from 'express';
import { signupController, varifyemail } from '../controller/auth/signupController.js';
import loginController from '../controller/auth/loginController.js';
import {setMetaAccessToken} from '../controller/setMetaAccessToken.js';
import {googleSignupController} from '../controller/auth/googleSignupController.js';
import User from '../model/userModel.js';

const router = express.Router();

router.post('/signup',signupController);
router.get('/verify-email/:token',varifyemail);
router.post('/login',loginController);

router.post('/google-signup', googleSignupController);

router.post('/setMetaAccessToken', setMetaAccessToken);

router.get("/users/:id", async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json(user);
});



export default router;



