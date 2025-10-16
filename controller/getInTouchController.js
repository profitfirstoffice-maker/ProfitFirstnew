import GetInTouch from '../model/getInTouch.js';
import qs from 'qs';
import axios from 'axios';


const getInTouchController = async (req, res) => {
  const { name, email, message, phone, website } = req.body;

  if (!name || !email || !phone) {
    return res.status(400).json({ error: "All fields are required" });
  }

  const GOOGLE_SCRIPT_URL="https://script.google.com/macros/s/AKfycbzvJR1WvD2B6gw4I-_aWzAzX0-rK8gQ3NtcvTupcAF8pb3iJxpKG8_EKaN32KMXwqO0/exec";

  try {
    const newEntry = new GetInTouch({
      name,
      email,
      message,
      phone,
      website
    });

    await newEntry.save();

    
    // Send to Google Sheet
    const formData = qs.stringify({
      Name: name,
      Email: email,
      Phone: phone,
      Website: website,
      Message: message,
    });

    await axios.post(GOOGLE_SCRIPT_URL, formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    return res.status(200).json({ message: "We will get back to you soon" });
  } catch (error) {
    console.error("Error saving get-in-touch form:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

export default getInTouchController;