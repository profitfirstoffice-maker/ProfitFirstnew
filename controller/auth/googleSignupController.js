import User from "../../model/userModel.js";
import nodemailer from "nodemailer";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
dotenv.config();

// Reuse your transporter setup
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
}); 

// Generate random password
const generateRandomPassword = () => {
  return (
    Math.random().toString(36).slice(-10) +
    Math.random().toString(36).slice(-2).toUpperCase()
  );
};

const googleSignupController = async (req, res) => {
  const { firstName, lastName, email } = req.body;

  if (!firstName || !lastName || !email) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    let user = await User.findOne({ email });

    if (user) {
      return res
        .status(400)
        .json({ message: "Email is already registered. Please log in." });
    }

    const randomPassword = generateRandomPassword();
    const hashedPassword = await bcrypt.hash(randomPassword, 10);

    user = await User.create({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      isVerified: true,
    });

    await transporter.sendMail({
      from: process.env.MAIL_USER,
      to: email,
      subject: "Welcome to Profit First - Your Login Credentials",
      html: `
        <p>Hi ${firstName},</p>
        <p>You signed up using your Google account. Here's your login info:</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Password:</strong> ${randomPassword}</p>
        <p>You can now log in using the above credentials. Feel free to change your password after logging in.</p>
        <p>Best regards,<br/>Profit First Team</p>
      `,
    });

    return res
      .status(201)
      .json({ message: "Account created. Credentials sent via email." });
  } catch (err) {
    console.error("Google signup error:", err);
    return res
      .status(500)
      .json({ message: "Server error during Google signup" });
  }
};

export { googleSignupController };
