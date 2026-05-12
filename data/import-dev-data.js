import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import dotenv from "dotenv";

import connectDB from "../config/db.js";
import Product from "../models/productModel.js";
import Restaurant from "../models/restaurantModel.js";
import Review from "../models/reviewModel.js";
import Rider from "../models/riderModel.js";
import User from "../models/userModel.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../config.env") });

connectDB();

//  READ JSON FILE
const products = JSON.parse(
  fs.readFileSync(`${__dirname}/products.json`, "utf-8")
);

const users = JSON.parse(fs.readFileSync(`${__dirname}/users.json`, "utf-8"));

const reviews = JSON.parse(
  fs.readFileSync(`${__dirname}/reviews.json`, "utf-8")
);

const riders = JSON.parse(fs.readFileSync(`${__dirname}/riders.json`, "utf-8"));

const restaurants = JSON.parse(
  fs.readFileSync(`${__dirname}/restaurants.json`, "utf-8")
);

const collections = [
  { Model: User, data: users },
  { Model: Restaurant, data: restaurants },
  { Model: Product, data: products },
  { Model: Rider, data: riders },
  { Model: Review, data: reviews },
];

// IMPORT DATA INTO DB
const importData = async () => {
  try {
    await Promise.all(
      collections.map(({ Model, data }) => Model.create(data))
    );
    process.stdout.write("Data successfully loaded\n");
  } catch (err) {
    process.stderr.write(`${err.stack || err.message}\n`);
  }
  process.exit();
};

// DELETE ALL DATA FROM COLLECTIONS
const deleteData = async () => {
  try {
    await Promise.all(collections.map(({ Model }) => Model.deleteMany()));

    process.stdout.write("Data successfully deleted\n");
  } catch (err) {
    process.stderr.write(`${err.stack || err.message}\n`);
  }
  process.exit();
};

if (process.argv[2] === "--import") {
  importData();
} else if (process.argv[2] === "--delete") {
  deleteData();
}
