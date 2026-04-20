import { generateJWTToken_email, generateJWTToken_username } from "../utils/generateJWTToken.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { sendMail } from "../utils/SendMail.js";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { User } from "../models/user.model.js";
import { UnRegisteredUser } from "../models/unRegisteredUser.model.js";
import dotenv from "dotenv";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

dotenv.config();

const isGoogleOAuthConfigured = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

const googleCallbackURL = `${process.env.BACKEND_URL}/auth/google/callback`;
console.log("=== GOOGLE OAUTH DEBUG ===");
console.log("BACKEND_URL:", process.env.BACKEND_URL);
console.log("callbackURL:", googleCallbackURL);
console.log("==========================");

if (isGoogleOAuthConfigured) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: googleCallbackURL,
      },
      async (accessToken, refreshToken, profile, done) => {
        done(null, profile);
      }
    )
  );
}

const oauthNotConfiguredResponse = (res) => {
  return res.status(503).json(new ApiError(503, "Google OAuth is not configured on the server"));
};

export const googleAuthHandler = (req, res, next) => {
  if (!isGoogleOAuthConfigured) {
    return oauthNotConfiguredResponse(res);
  }

  console.log("BACKEND_URL:", process.env.BACKEND_URL); // ← temporary debug log

  return passport.authenticate("google", {
    scope: ["profile", "email"],
    prompt: "select_account",
  })(req, res, next);
};

export const googleAuthCallback = (req, res, next) => {
  if (!isGoogleOAuthConfigured) {
    return oauthNotConfiguredResponse(res);
  }

  return passport.authenticate("google", {
    failureRedirect: `${process.env.FRONTEND_URL}/login`,
    session: false,
  })(req, res, next);
};

export const handleGoogleLoginCallback = asyncHandler(async (req, res) => {
  console.log("\n******** Inside handleGoogleLoginCallback function ********");

  const existingUser = await User.findOne({ email: req.user._json.email });

  if (existingUser) {
    const jwtToken = generateJWTToken_username(existingUser);
    const expiryDate = new Date(Date.now() + 1 * 60 * 60 * 1000);
    res.cookie("accessToken", jwtToken, { 
      httpOnly: true, 
      expires: expiryDate, 
      secure: true, 
      sameSite: "none" 
    });
    return res.redirect(`${process.env.FRONTEND_URL}/discover`);
  }

  let unregisteredUser = await UnRegisteredUser.findOne({ email: req.user._json.email });
  if (!unregisteredUser) {
    console.log("Creating new Unregistered User");
    unregisteredUser = await UnRegisteredUser.create({
      name: req.user._json.name,
      email: req.user._json.email,
      picture: req.user._json.picture,
    });
  }
  const jwtToken = generateJWTToken_email(unregisteredUser);
  const expiryDate = new Date(Date.now() + 0.5 * 60 * 60 * 1000);
  res.cookie("accessTokenRegistration", jwtToken, { 
    httpOnly: true, 
    expires: expiryDate, 
    secure: true, 
    sameSite: "none" 
  });
  return res.redirect(`${process.env.FRONTEND_URL}/register`);
});

export const handleLogout = (req, res) => {
  console.log("\n******** Inside handleLogout function ********");
  res.clearCookie("accessToken");
  return res.status(200).json(new ApiResponse(200, null, "User logged out successfully"));
};

export const handleLocalSignup = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    throw new ApiError(400, "Please provide all details");
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ApiError(400, "User already exists with this email");
  }

  let unregisteredUser = await UnRegisteredUser.findOne({ email });
  if (unregisteredUser && unregisteredUser.isVerified) {
    throw new ApiError(400, "User already exists with this email. Please log in.");
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);
  const verificationToken = crypto.randomBytes(32).toString("hex");

  if (unregisteredUser) {
    unregisteredUser.name = name;
    unregisteredUser.password = hashedPassword;
    unregisteredUser.verificationToken = verificationToken;
    unregisteredUser.isVerified = false;
    await unregisteredUser.save();
  } else {
    unregisteredUser = await UnRegisteredUser.create({
      name,
      email,
      password: hashedPassword,
      isVerified: false,
      verificationToken,
    });
  }

  const verifyUrl = `${process.env.BACKEND_URL}/auth/verify/${verificationToken}`;
  const message = `
    <h1>Verify Your SkillSwap Account</h1>
    <p>Hi ${name},</p>
    <p>Please click the link below to verify your account:</p>
    <a href="${verifyUrl}" style="padding:10px 20px;background:#3b5998;color:white;text-decoration:none;border-radius:5px;">Verify Email</a>
  `;

  await sendMail(email, "Verify Your SkillSwap Account", message);

  return res.status(200).json(new ApiResponse(200, null, "Verification email sent. Please check your inbox."));
});

export const handleVerifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const unregisteredUser = await UnRegisteredUser.findOne({ verificationToken: token });

  if (!unregisteredUser) {
    return res.status(400).send("Invalid or expired verification token.");
  }

  unregisteredUser.isVerified = true;
  unregisteredUser.verificationToken = undefined;
  await unregisteredUser.save();

  const jwtToken = generateJWTToken_email(unregisteredUser);
  const expiryDate = new Date(Date.now() + 0.5 * 60 * 60 * 1000);
  res.cookie("accessTokenRegistration", jwtToken, { 
    httpOnly: true, 
    expires: expiryDate, 
    secure: true, 
    sameSite: "none" 
  });

  // Redirect to register (onboarding) after successful verification
  return res.redirect(`${process.env.FRONTEND_URL}/register`);
});

export const handleLocalLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    throw new ApiError(400, "Please provide email and password");
  }

  // Handle fully registered user login
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    if (!existingUser.password) throw new ApiError(400, "This account was created via Google. Please log in with Google.");
    const isMatch = await bcrypt.compare(password, existingUser.password);
    if (!isMatch) throw new ApiError(400, "Invalid email or password");

    const jwtToken = generateJWTToken_username(existingUser);
    const expiryDate = new Date(Date.now() + 1 * 60 * 60 * 1000);
    res.cookie("accessToken", jwtToken, { 
      httpOnly: true, 
      expires: expiryDate, 
      secure: true, 
      sameSite: "none" 
    });
    return res.status(200).json(new ApiResponse(200, { redirect: "/discover" }, "Login successful"));
  }

  // Handle unregistered user login (verified but haven't finished onboarding)
  const unregisteredUser = await UnRegisteredUser.findOne({ email });
  if (unregisteredUser) {
    if (!unregisteredUser.isVerified) throw new ApiError(400, "Please verify your email first.");
    if (!unregisteredUser.password) throw new ApiError(400, "This account was created via Google. Please log in with Google.");
    
    const isMatch = await bcrypt.compare(password, unregisteredUser.password);
    if (!isMatch) throw new ApiError(400, "Invalid email or password");

    const jwtToken = generateJWTToken_email(unregisteredUser);
    const expiryDate = new Date(Date.now() + 0.5 * 60 * 60 * 1000);
    res.cookie("accessTokenRegistration", jwtToken, { 
      httpOnly: true, 
      expires: expiryDate, 
      secure: true, 
      sameSite: "none" 
    });
    return res.status(200).json(new ApiResponse(200, { redirect: "/register" }, "Login successful. Please complete profile."));
  }

  throw new ApiError(404, "User not found");
});