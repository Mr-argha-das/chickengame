import multer from "multer";
import path from "path";
import { Banner } from "../models/banner.model.js";

const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, `banner-${Date.now()}${path.extname(file.originalname)}`);
  },
});

export const uploadBanner = multer({ storage });

export const addBanner = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Banner image is required" });
    }

    const banner = await Banner.create({
      title: req.body.title || "Banner",
      link: req.body.link || "",
      imageUrl: `/uploads/${req.file.filename}`,
    });

    return res.status(201).json({
      success: true,
      message: "Banner added successfully",
      data: banner,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error adding banner",
      error: error.message,
    });
  }
};

export const getBanners = async (req, res) => {
  try {
    const banners = await Banner.find({ isActive: true }).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: banners });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error fetching banners",
      error: error.message,
    });
  }
};

export const deleteBanner = async (req, res) => {
  try {
    const deletedBanner = await Banner.findByIdAndDelete(req.params.id);
    if (!deletedBanner) {
      return res.status(404).json({ success: false, message: "Banner not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Banner deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error deleting banner",
      error: error.message,
    });
  }
};
