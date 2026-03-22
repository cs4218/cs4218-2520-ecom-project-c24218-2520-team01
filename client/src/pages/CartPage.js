import React, { useState, useEffect } from "react";
import Layout from "./../components/Layout";
import { useCart } from "../context/cart";
import { useAuth } from "../context/auth";
import { useNavigate } from "react-router-dom";
import DropIn from "braintree-web-drop-in-react";
import { AiFillWarning } from "react-icons/ai";
import axios from "axios";
import toast from "react-hot-toast";
import "../styles/CartStyles.css";

export const calculateTotalPrice = (cart = []) => {
  try {
    let total = 0;
    cart.forEach((item) => {
      total += item.price * (item.quantity || 1);
    });
    
    if (isNaN(total) || !isFinite(total)) {
      console.log("Invalid total calculated");
      return "$0.00";
    }
    
    return total.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
    });
  } catch (error) {
    console.log(error);
    return "$0.00";
  }
};

const CartPage = () => {
  const [auth, setAuth] = useAuth();
  const { cart, setCart, removeCartItem } = useCart();
  const [clientToken, setClientToken] = useState("");
  const [instance, setInstance] = useState(null);
  /**
 * AI Usage Declaration
 *
 * Tool Used: GPT-5.4
 *
 * Prompt:
 * - Asked for reference ideas on how to add config for test card details
 *
 * How the AI Output Was Used:
 * - Used the suggestions on adding the test id config for card
 *  */

  const [showTestCardForm, setShowTestCardForm] = useState(false);
  const [testCardDetails, setTestCardDetails] = useState({
    number: "",
    expiry: "",
    cvv: "",
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const isE2ETest = process.env.REACT_APP_E2E_TEST === "true";

  //total price
  const totalPrice = () => calculateTotalPrice(cart);

  //get payment gateway token
  const getToken = async () => {
    try {
      const { data } = await axios.get("/api/v1/product/braintree/token");
      setClientToken(data?.clientToken);
    } catch (error) {
      console.log(error);
    }
  };
  useEffect(() => {
    getToken();
  }, [auth?.token]);

  const hasValidTestCardDetails = () => {
    const normalizedNumber = testCardDetails.number.replace(/\s+/g, "");
    const normalizedExpiry = testCardDetails.expiry.replace(/\s+/g, "");
    const normalizedCvv = testCardDetails.cvv.trim();

    return (
      normalizedNumber.length >= 16 &&
      /^\d{2}\/\d{4}$/.test(normalizedExpiry) &&
      normalizedCvv.length >= 3
    );
  };

  //handle payments
  const handlePayment = async () => {
    try {
      setLoading(true);
      let nonce = "";

      if (isE2ETest) {
        if (!hasValidTestCardDetails()) {
          toast.error("Please enter valid card details.");
          setLoading(false);
          return;
        }
        nonce = "fake-valid-nonce";
      } else {
        const paymentMethod = await instance.requestPaymentMethod();
        nonce = paymentMethod.nonce;
      }

      const { data } = await axios.post("/api/v1/product/braintree/payment", {
        nonce,
        cart,
      });
      setLoading(false);
      localStorage.removeItem("cart");
      setCart([]);
      navigate("/dashboard/user/orders");
      toast.success("Payment Completed Successfully");
    } catch (error) {
      console.log(error);
      toast.error("Payment failed. Please try again.");
      setLoading(false);
    }
  };
  return (
    <Layout>
      <div className=" cart-page">
        <div className="row">
          <div className="col-md-12">
            <h1 className="text-center bg-light p-2 mb-1">
              {!auth?.user
                ? "Hello Guest"
                : `Hello  ${auth?.token && auth?.user?.name}`}
              <p className="text-center">
                {cart?.length
                  ? `You Have ${cart.length} items in your cart ${
                      auth?.token ? "" : "please login to checkout !"
                    }`
                  : " Your Cart Is Empty"}
              </p>
            </h1>
          </div>
        </div>
        <div className="container ">
          <div className="row ">
            <div className="col-md-7  p-0 m-0">
              {cart?.map((p) => (
                <div className="row card flex-row" key={p._id}>
                  <div className="col-md-4">
                    <img
                      src={`/api/v1/product/product-photo/${p._id}`}
                      className="card-img-top"
                      alt={p.name}
                      width="100%"
                      height={"130px"}
                    />
                  </div>
                  <div className="col-md-4">
                    <p>{p.name}</p>
                    <p>{p.description ? p.description.substring(0, 30) : ""}</p>
                    <p>Price : {p.price}</p>
                  </div>
                  <div className="col-md-4 cart-remove-btn">
                    <button
                      className="btn btn-danger"
                      onClick={() => removeCartItem(p._id)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="col-md-5 cart-summary ">
              <h2>Cart Summary</h2>
              <p>Total | Checkout | Payment</p>
              <hr />
              <h4>Total : {totalPrice()} </h4>
              {auth?.user?.address ? (
                <>
                  <div className="mb-3">
                    <h4>Current Address</h4>
                    <h5>{auth?.user?.address}</h5>
                    <button
                      className="btn btn-outline-warning"
                      onClick={() => navigate("/dashboard/user/profile")}
                    >
                      Update Address
                    </button>
                  </div>
                </>
              ) : (
                <div className="mb-3">
                  {auth?.token ? (
                    <button
                      className="btn btn-outline-warning"
                      onClick={() => navigate("/dashboard/user/profile")}
                    >
                      Update Address
                    </button>
                  ) : (
                    <button
                      className="btn btn-outline-warning"
                      onClick={() =>
                        navigate("/login", {
                          state: "/cart",
                        })
                      }
                    >
                      Please Login to checkout
                    </button>
                  )}
                </div>
              )}
              <div className="mt-2">
                {!clientToken || !auth?.token || !cart?.length ? (
                  ""
                ) : isE2ETest ? (
                  <>
                    <button
                      className="btn btn-outline-primary mb-3"
                      onClick={() => setShowTestCardForm((current) => !current)}
                      disabled={loading || !auth?.user?.address}
                    >
                      Paying with Card
                    </button>

                    {showTestCardForm && (
                      <div className="mb-3">
                        <input
                          aria-label="Credit Card Number"
                          className="form-control mb-2"
                          onChange={(event) =>
                            setTestCardDetails((current) => ({
                              ...current,
                              number: event.target.value,
                            }))
                          }
                          placeholder="4242 4242 4242 4242"
                          type="text"
                          value={testCardDetails.number}
                        />
                        <input
                          aria-label="Expiration Date"
                          className="form-control mb-2"
                          onChange={(event) =>
                            setTestCardDetails((current) => ({
                              ...current,
                              expiry: event.target.value,
                            }))
                          }
                          placeholder="MM/YYYY"
                          type="text"
                          value={testCardDetails.expiry}
                        />
                        <input
                          aria-label="CVV"
                          className="form-control mb-3"
                          onChange={(event) =>
                            setTestCardDetails((current) => ({
                              ...current,
                              cvv: event.target.value,
                            }))
                          }
                          placeholder="CVV"
                          type="text"
                          value={testCardDetails.cvv}
                        />
                      </div>
                    )}

                    <button
                      className="btn btn-primary"
                      onClick={handlePayment}
                      disabled={loading || !showTestCardForm || !auth?.user?.address}
                    >
                      {loading ? "Processing ...." : "Make Payment"}
                    </button>
                  </>
                ) : (
                  <>
                    <DropIn
                      options={{
                        authorization: clientToken,
                        paypal: {
                          flow: "vault",
                        },
                      }}
                      onInstance={(instance) => setInstance(instance)}
                    />

                    <button
                      className="btn btn-primary"
                      onClick={handlePayment}
                      disabled={loading || !instance || !auth?.user?.address}
                    >
                      {loading ? "Processing ...." : "Make Payment"}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CartPage;
