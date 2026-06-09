import { Banner } from "../models/banner.model.js";

export const seedDefaultBanner = async () => {
  const existingBanner = await Banner.findOne({ title: "Demo Infinity Banner" });

  if (existingBanner) return;

  await Banner.create({
    title: "Demo Infinity Banner",
    imageUrl: "/uploads/demo-infinity-banner.png",
    link: "/",
  });

  console.log("✅ Demo banner created successfully.");
};
