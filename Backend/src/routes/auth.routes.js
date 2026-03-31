import { Router } from "express";
import {
  googleAuthCallback,
  googleAuthHandler,
  handleGoogleLoginCallback,
  handleLogout,
  handleLocalSignup,
  handleVerifyEmail,
  handleLocalLogin
} from "../controllers/auth.controllers.js";

const router = Router();

router.get("/google", googleAuthHandler);
router.get("/google/callback", googleAuthCallback, handleGoogleLoginCallback);
router.get("/logout", handleLogout);

router.post("/signup", handleLocalSignup);
router.get("/verify/:token", handleVerifyEmail);
router.post("/login", handleLocalLogin);

export default router;


