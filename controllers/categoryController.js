import categoryModel from "../models/categoryModel.js";
import slugify from "slugify";

// For the whole file: Bugs fixed by Nicholas Cheng, A0269648H

export const createCategoryController = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !name?.trim()) {
      return res.status(422).send({
        success: false,
        message: "Category name cannot be empty"
      });
    }

    const existingCategory = await categoryModel.findOne({ name });

    if (existingCategory) {
      return res.status(409).send({
        success: false,
        message: "Category already exists",
      });
    }

    const category = await new categoryModel({
      name,
      slug: slugify(name),
    }).save();

    res.status(201).send({
      success: true,
      message: "New category created",
      category,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      error,
      message: "Error while creating category",
    });
  }
};

//update category
export const updateCategoryController = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !name?.trim()) {
      return res.status(422).send({
        success: false,
        message: "New category name cannot be empty"
      });
    }

    const { id } = req.params;

    if (!id) {
      return res.status(422).send({
        success: false,
        message: "Category id cannot be empty"
      });
    }

    const category = await categoryModel.findByIdAndUpdate(
      id,
      { name, slug: slugify(name) },
      { new: true }
    );

    if (!category) {
      return res.status(404).send({
        success: false,
        message: "Category not found"
      });
    }

    res.status(200).send({
      success: true,
      message: "Category updated successfully",
      category,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      error,
      message: "Error while updating category",
    });
  }
};

// get all cat
export const categoryController = async (req, res) => {
  try {
    const category = await categoryModel.find({});
    res.status(200).send({
      success: true,
      message: "All categories fetched",
      category,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      error,
      message: "Error while fetching categories",
    });
  }
};

// single category
export const singleCategoryController = async (req, res) => {
  try {
    const { slug } = req.params;

    if (!slug) {
      return res.status(422).send({
        success: false,
        message: "Category slug cannot be empty"
      });
    }

    const category = await categoryModel.findOne({ slug });

    if (!category) {
      return res.status(404).send({
        success: false,
        message: "No category found"
      });
    }

    res.status(200).send({
      success: true,
      message: "Get single category successfully",
      category,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      error,
      message: "Error while fetching single category",
    });
  }
};

//delete category
export const deleteCategoryController = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(422).send({
        success: false,
        message: "Category id cannot be empty"
      });
    }

    const deletedCategory = await categoryModel.findByIdAndDelete(id);

    if (!deletedCategory) {
      return res.status(404).send({
        success: false,
        message: "Failed to delete because no category is found"
      });
    }

    res.status(200).send({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error while deleting category",
      error,
    });
  }
};