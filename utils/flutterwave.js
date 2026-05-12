import axios from "axios";
import Flutterwave from "flutterwave-node-v3";

let flutterwaveClient;

function getFlutterwaveClient() {
  if (!process.env.FLW_PUBLIC_KEY || !process.env.FLW_SECRET_KEY) {
    throw new Error("Flutterwave keys are not configured");
  }

  if (!flutterwaveClient) {
    flutterwaveClient = new Flutterwave(
      process.env.FLW_PUBLIC_KEY,
      process.env.FLW_SECRET_KEY
    );
  }

  return flutterwaveClient;
}

export const flw = new Proxy(
  {},
  {
    get(_target, property) {
      return getFlutterwaveClient()[property];
    },
  }
);

export const axiosFlw = axios.create({
  baseURL: process.env.FLW_BASE_URL ?? "https://api.flutterwave.com",
  headers: {
    Authorization: `Bearer ${process.env.FLW_SECRET_KEY}`,
    "Content-Type": "application/json",
  },
});
