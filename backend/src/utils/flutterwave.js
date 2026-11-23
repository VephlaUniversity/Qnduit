import axios from "axios";

const flutterwave = axios.create({
  baseURL: "https://api.flutterwave.com/v3",
  timeout: 30000,
  headers: {
    Authorization: `Bearer ${process.env.FLW_SECRET_KEY}`,
    "Content-Type": "application/json",
    Accept: "application/json",
    "User-Agent": "Qnduit-Backend/1.0 (+https://qnduit.com)",
  },
});

flutterwave.interceptors.response.use(
  (res) => res,
  (error) => {
    const data = error.response?.data;
    if (typeof data === "string" && /<html/i.test(data)) {
      const status = error.response.status;
      const ray = error.response.headers?.["cf-ray"];
      error.response.data = {
        message: `Flutterwave blocked the request with an HTML challenge page (HTTP ${status}${
          ray ? `, cf-ray ${ray}` : ""
        })`,
      };
      error.message = error.response.data.message;
    }
    return Promise.reject(error);
  }
);

export default flutterwave;