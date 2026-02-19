import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import Layout from "./../components/Layout";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import "../styles/ProductDetailsStyles.css";

const ProductDetails = () => {
  const params = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [cart, setCart] = useState(() => {
    return JSON.parse(localStorage.getItem("cart")) || [];
  });

  // initial product details
  useEffect(() => {
    if (params?.slug) getProduct();
  }, [params?.slug]);
  //getProduct
  const getProduct = async () => {
    try {
      const { data } = await axios.get(
        `/api/v1/product/get-product/${params.slug}`
      );
      setProduct(data?.product);
      getSimilarProduct(data?.product._id, data?.product.category._id);
    } catch (error) {
      console.log("Failed to fetch product", error);
    }
  };

  // get similar product
  const getSimilarProduct = async (productId, categoryId) => {
    try {
      const { data } = await axios.get(
        `/api/v1/product/related-product/${productId}/${categoryId}`
      );
      setRelatedProducts(data?.products);
    } catch (error) {
      console.log("Failed to fetch related products", error);
    }
  };

  const handleAddToCart = (item) => {
    const newCart = [...cart, item];
    setCart(newCart);
    localStorage.setItem("cart", JSON.stringify(newCart));
    toast.success("Item Added to cart");
  };

  if (!product) {
    return (
      <Layout>
        <div className="container text-center py-5">
          <h3>Product not found</h3>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="row container product-details">
        <div className="col-md-6">
          <img
            src={`/api/v1/product/product-photo/${product._id}`}
            className="card-img-top"
            alt={product.name}
            height="300"
            width={"350px"}
          />
        </div>
        <div className="col-md-6 product-details-info">
          <h1 className="text-center">Product Details</h1>
          <hr />
          <h6>Name: {product.name}</h6>
          <h6>Description: {product.description}</h6>
          <h6>
            Price:
            {product?.price?.toLocaleString("en-US", {
              style: "currency",
              currency: "USD",
            })}
          </h6>
          <h6>Category: {product?.category?.name}</h6>
          <button 
            className="btn btn-secondary ms-1" 
            onClick={() => handleAddToCart(product)}>
              ADD TO CART
          </button>
        </div>
      </div>
      <hr />
      <div className="row container similar-products">
        <h4>Similar Products</h4>
        {relatedProducts.length === 0 ? (
          <p className="text-center">No Similar Products found</p>
        ):(
          <div className="d-flex flex-wrap">
            {relatedProducts?.map((p) => (
              <div className="card m-2" key={p._id}>
                <img
                  src={`/api/v1/product/product-photo/${p._id}`}
                  className="card-img-top"
                  alt={p.name}
                />
                <div className="card-body">
                  <div className="card-name-price">
                    <h5 className="card-title">{p.name}</h5>
                    <h5 className="card-title card-price">
                      {p.price.toLocaleString("en-US", {
                        style: "currency",
                        currency: "USD",
                      })}
                    </h5>
                  </div>
                  <p className="card-text ">
                    {p.description.substring(0, 60)}...
                  </p>
                  <div className="card-name-price">
                    <button
                      className="btn btn-info ms-1"
                      onClick={() => navigate(`/product/${p.slug}`)}
                    >
                      More Details
                    </button>
                    <button
                      className="btn btn-dark ms-1"
                      onClick={() => handleAddToCart(p)}
                    >
                      ADD TO CART
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ProductDetails;