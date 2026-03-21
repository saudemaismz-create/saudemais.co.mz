
import axios from 'axios';

async function test() {
  try {
    console.log("Testing POST /api/auth/send-2fa...");
    const response = await axios.post('http://localhost:3000/api/auth/send-2fa', {
      email: 'caneabacarhimiacane@gmail.com'
    });
    console.log("Status:", response.status);
    console.log("Data:", response.data);
  } catch (error: any) {
    console.error("Error:", error.response?.status, error.response?.data || error.message);
  }
}

test();
