import User from "../../model/userModel.js";
import nodemailer from "nodemailer";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

// Email Transporter

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

const signupController = async (req, res) => {
  const { firstName, lastName, email, password } = req.body;

  if (!firstName || !lastName || !email || !password) {
    return res.status(400).json({ message: "Please fill all fields" });
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        message: "Account creation failed. Email may already be in use.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      isVerified: false,
    });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
    const verifyUrl = `${process.env.FRONTEND_URL}/verify-email/${token}`;

    try {
      await transporter.sendMail({
        from: process.env.MAIL_USER,
        to: email,
        subject: "Confirm Your Email for Profit First Onboarding",
        html: `
                    <p>Hi ${firstName},</p>
                    <p>Thank you for choosing Profit First! We're thrilled to help you simplify your data and prioritize profit in your business.</p>
                    <p>To get started with your account, we just need to verify your email address. Please click the link below to confirm:</p>
                    <p><a href="${verifyUrl}">Confirm Email</a></p>
                    <p>This confirmation helps ensure that your account stays secure and ready for the next steps in your Profit First journey.</p>
                    <p>If you need any assistance, feel free to reach out to our support team at support@profitfirst.co.in</p>
                    <p>Best regards,<br/>Profit First Team</p>
                `,
      });

      return res.status(200).json({ message: "Verification email sent" });
    } catch (emailErr) {
      console.error("Email send failed:", emailErr);
      return res
        .status(500)
        .json({ message: "Failed to send verification email" });
    }
  } catch (err) {
    console.error("Signup error:", err);
    return res.status(500).json({ message: "Signup failed" });
  }
};

const varifyemail = async (req, res) => {
  console.log("varify email hit");
  try {
    const decoded = jwt.verify(req.params.token, process.env.JWT_SECRET);
    const user = await User.findByIdAndUpdate(
      decoded.id,
      { isVerified: true },
      { new: true }
    );
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }
    return res
      .status(200)
      .json({ message: "Email verified. You can now log in." });
  } catch (err) {
    console.error("Verification error:", err);
    res.status(400).json({ message: "Invalid or expired verification link." });
  }
};
export { signupController, varifyemail };
