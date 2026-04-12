# CS4218 Project - Virtual Vault

## 1. Project Introduction

Virtual Vault is a full-stack MERN (MongoDB, Express.js, React.js, Node.js) e-commerce website, offering seamless connectivity and user-friendly features. The platform provides a robust framework for online shopping. The website is designed to adapt to evolving business needs and can be efficiently extended.

## 2. Website Features

- **User Authentication**: Secure user authentication system implemented to manage user accounts and sessions.
- **Payment Gateway Integration**: Seamless integration with popular payment gateways for secure and reliable online transactions.
- **Search and Filters**: Advanced search functionality and filters to help users easily find products based on their preferences.
- **Product Set**: Organized product sets for efficient navigation and browsing through various categories and collections.

## 3. Your Task

- **Unit and Integration Testing**: Utilize Jest for writing and running tests to ensure individual components and functions work as expected, finding and fixing bugs in the process.
- **UI Testing**: Utilize Playwright for UI testing to validate the behavior and appearance of the website's user interface.
- **Code Analysis and Coverage**: Utilize SonarQube for static code analysis and coverage reports to maintain code quality and identify potential issues.
- **Load Testing**: Leverage JMeter for load testing to assess the performance and scalability of the ecommerce platform under various traffic conditions.

## 4. Setting Up The Project

### 1. Installing Node.js

1. **Download and Install Node.js**:
    - Visit [nodejs.org](https://nodejs.org) to download and install Node.js.

2. **Verify Installation**:
    - Open your terminal and check the installed versions of Node.js and npm:
        ```bash
        node -v
        npm -v
        ```

### 2. MongoDB Setup

1. **Download and Install MongoDB Compass**:
    - Visit [MongoDB Compass](https://www.mongodb.com/products/tools/compass) and download and install MongoDB Compass for your operating system.

2. **Create a New Cluster**:
    - Sign up or log in to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register).
    - After logging in, create a project and within that project deploy a free cluster.

3. **Configure Database Access**:
    - Create a new user for your database (if not alredy done so) in MongoDB Atlas.
    - Navigate to "Database Access" under "Security" and create a new user with the appropriate permissions.

4. **Whitelist IP Address**:
    - Go to "Network Access" under "Security" and whitelist your IP address to allow access from your machine.
    - For example, you could whitelist 0.0.0.0 to allow access from anywhere for ease of use.

5. **Connect to the Database**:
    - In your cluster's page on MongoDB Atlas, click on "Connect" and choose "Compass".
    - Copy the connection string.

6. **Establish Connection with MongoDB Compass**:
    - Open MongoDB Compass on your local machine, paste the connection string (replace the necessary placeholders), and establish a connection to your cluster.

### 3. Application Setup

To download and use the MERN (MongoDB, Express.js, React.js, Node.js) app from GitHub, follow these general steps:

1. **Clone the Repository**
    - Go to the GitHub repository of the MERN app.
    - Click on the "Code" button and copy the URL of the repository.
    - Open your terminal or command prompt.
    - Use the `git clone` command followed by the repository URL to clone the repository to your local machine:
        ```bash
        git clone <repository_url>
        ```
    - Navigate into the cloned directory.

2. **Install Frontend and Backend Dependencies**
    - Run the following command in your project's root directory:

        ```
        npm install && cd client && npm install && cd ..
        ```

3. **Add database connection string to `.env`**
    - Add the connection string copied from MongoDB Atlas to the `.env` file inside the project directory (replace the necessary placeholders):
        ```env
        MONGO_URL = <connection string>
        ```

4. **Adding sample data to database**
    - Download “Sample DB Schema” from Canvas and extract it.
    - In MongoDB Compass, create a database named `test` under your cluster.
    - Add four collections to this database: `categories`, `orders`, `products`, and `users`.
    - Under each collection, click "ADD DATA" and import the respective JSON from the extracted "Sample DB Schema".

5. **Running the Application**
    - Open your web browser.
    - Use `npm run dev` to run the app from root directory, which starts the development server.
    - Navigate to `http://localhost:3000` to access the application.

## 5. Unit Testing with Jest

Unit testing is a crucial aspect of software development aimed at verifying the functionality of individual units or components of a software application. It involves isolating these units and subjecting them to various test scenarios to ensure their correctness.  
Jest is a popular JavaScript testing framework widely used for unit testing. It offers a simple and efficient way to write and execute tests in JavaScript projects.

### Getting Started with Jest

To begin unit testing with Jest in your project, follow these steps:

1. **Install Jest**:  
   Use your preferred package manager to install Jest. For instance, with npm:

    ```bash
    npm install --save-dev jest

    ```

2. **Write Tests**  
   Create test files for your components or units where you define test cases to evaluate their behaviour.

3. **Run Tests**  
   Execute your tests using Jest to ensure that your components meet the expected behaviour.  
   You can run the tests by using the following command in the root of the directory:
    - **Frontend tests**

        ```bash
        npm run test:frontend
        ```

    - **Backend tests**

        ```bash
        npm run test:backend
        ```

    - **All the tests**
        ```bash
        npm run test
        ```

## 6. Who Handled What

### Lim Jia Wei (A0277381W)

I was responsible for testing the following components:

**Server Files:**

- `controllers/authController.js`
    - `getUsersController` - New function

- `config/db.js `
- `models/userModel.js`

**Client Files:**

- `components/AdminMenu.js`
- `components/Form/CategoryForm.js`

- `pages/admin/AdminDashboard.js`
- `pages/admin/CreateCategory.js`
- `pages/admin/CreateProduct.js`
- `pages/admin/UpdateProduct.js`
- `pages/admin/AdminOrders.js`
- `pages/admin/Products.js`
- `pages/admin/Users.js`

#### Milestone 1 Unit Test

For **milestone 1**, I unit tested all files specified above with the exception of `userModel.js` due to it being left for integration testing. (_more information can be seen in the MS1 report_).

### Muhammad Zaidan bin Sani (A0273278U)

I am responsible for testing the following components:
**Unit Tests**

- Product CRUD
    - `controllers/productController`
        - `createProductController`
        - `deleteProductController`
        - `updateProductController`
        - `getProductController`
        - `getSingleProductController`
        - `productPhotoController`
- Product filters
    - `controllers/productController`
        - `productFiltersController`
        - `productCountController`
        - `productListController`
        - `searchProductController`
        - `relatedProductsController`
        - `productCategoryController`
- Product model - `models/productModel`

**Integration tests**

- Product integrations
    - Integration with Model and DB
    - Integration with Auth middleware, Formidable etc.
- Order integration - Integration with Model and DB - Integration with Auth middleware

**E2E tests**

- Product creation with admin
- Category > Product creation with admin
- Related product viewing
- Authentication flow tests

**Security Testing**

- IDOR vulnerabilities
- MongoDB Injection
- Price and Checkout Tampering
- Session Replay attacks

#### Milestone 1 Unit Test

For **milestone 1**, I unit tested every function seen under Product CRUD and product filters above, and left the product model for integration testing (_more information can be seen in the MS1 report_).

#### Milestone 2 Integration and E2E tests

For **milestone 2**, I added unit tests for the product model, and bottom-up integration tests for the product and order integration flows, which involved integration with the relevant models, and integration tests.

I also added E2E tests for 4 scenarios as seen above.

(_more information can be seen in the MS2 report_).

#### Milestone 3 Non-Functional Tests

For **milestone 3**, I added tests to check for IDOR (Insecure Direct Object References) vulnerabilities, MongoDB Injection, price & checkout tampering as well as session replay. I fixed a few bugs relating to input validation to fix the security vulnerabilities found.

In addition, I used a white-box LLM-powered vulnerability scanner to find more vulnerabilties in the system.

(_more information can be seen in the MS3 report_).

### Nicholas Cheng De Fei (A0269648H)

#### Milestone 1 Unit Test

I am responsible for testing the following components:

_Server Files:_

- Category CRUD (_controllers/categoryController\.js_):
    - `createCategoryController`
    - `updateCategoryController`
    - `deleteCategoryController`
    - `categoryControlller`
    - `singleCategoryController`

- Payment (_controllers/productController\.js_):
    - `braintreeTokenController`
    - `brainTreePaymentController`

- Orders CRUD (_controllers/authController\.js_):
    - `getOrdersController`
    - `getAllOrdersController`
    - `orderStatusController`

- Models:
    - `models/categoryModel\.js`
    - `models/orderModel\.js`

_Client Files:_

- `hooks/useCategory\.js`
- `pages/Categories\.js`

For **milestone 1**, I have done unit test for all components.

#### Milestone 2 Integration & E2E UI Tests

I am responsible for testing the following components:

- Category CRUD (_controllers/categoryController\.js_):
    - `createCategoryController`
    - `updateCategoryController`
    - `deleteCategoryController`
    - `categoryControlller`
    - `singleCategoryController`

- Payment (_controllers/productController\.js_):
    - `braintreeTokenController`
    - `brainTreePaymentController`

- Models:
    - `models/categoryModel\.js`
    - `models/orderModel\.js`

- E2E UI Flows:
    - Attempt to login with an unregistered email (_Login Flow_)
    - Attempting checkout without being logged in (_Cart & Checkout Flow_)
    - Navigate to a specific category page (`CategoryProduct`) and view only products from that category (_Category Browsing Flow_)
    - Attempt to submit the form without uploading a photo or missing a required field (_Create Product Flow_)
    - Attempt to login with an incorrect password _Login Flow_)
    - Use the "Load More" button to fetch additional products (_pagination_)
    - Navigating to a product slug that does not exist or has been deleted (_fallback handling, Product Viewing Flow)_

For **milestone 2**, the first thing I did was to correct the issues that were feedback to me in milestone 1, for instance typos and also to do unit test for the `Models`.

Afterwards I did integraton tests for the category CRUD and the various payment using a bottom up incremental approach. I started with the lower level components like the controller, database / models and external components like Braintree. Afterwards I integrate the higher level components like the Express router, and authtentication middleware.

As for the E2E UI tests I used PLaywright to write and generate the various test cases for the assigned flows.

### Rachel Tai Ke Jia (A0258603A)

I am responsible for unit testing frontend components, context providers, and one backend controller:

- General Components and Pages
    - `components/Footer.js`
    - `components/Header.js`
    - `components/Layout.js`
    - `components/Spinner.js`
    - `pages/About.js`
    - `pages/Pagenotfound.js`
    - `pages/Contact.js`
    - `pages/Policy.js`
- Search, Product, Cart, and Home
    - `components/Form/SearchInput.js`
    - `context/search.js`
    - `pages/Search.js`
    - `pages/ProductDetails.js`
    - `pages/CategoryProduct.js`
    - `context/cart.js`
    - `pages/CartPage.js`
    - `pages/Homepage.js`
- User, Dashboard, Orders, Profile, and Auth Controller:
    - `components/UserMenu.js`
    - `pages/user/Dashboard.js`
    - `pages/user/Orders.js`
    - `pages/user/Profile.js`
    - `controllers/authController.js` (specifically `updateProfileController`)

#### Milestone 1 Unit Test

For **milestone 1**, I have done unit tests for all client components (pages, context, components) (_more information can be seen in the MS1 report_).

#### Milestone 3 Non-Functional Testing

I am responsible for the load testing setup using JMeter under `tests/nft/load-testing`, covering the main non-functional flows of the ecommerce platform:

- **Product browsing flow** for catalog, category, search, price filter, and pagination endpoints: 
    - [product-browsing-flow.jmx](tests/nft/load-testing/jmeter/product-browsing-flow.jmx) 
    - [run-browsing-load.sh](tests/nft/load-testing/scripts/run-browsing-load.sh) 
- **Search and filter flow** for category bootstrap, keyword search, and combined category-and-price filtering: 
    - [search-filter-flow.jmx](tests/nft/load-testing/jmeter/search-filter-flow.jmx) 
    - [run-search-filter-load.sh](tests/nft/load-testing/scripts/run-search-filter-load.sh) 
- **Authentication flow** for register, login, and token validation
    - [authentication-flow.jmx](tests/nft/load-testing/jmeter/authentication-flow.jmx) 
    - [run-auth-load.sh](tests/nft/load-testing/scripts/run-auth-load.sh)
- **Order checkout flow** for login, braintree token, payment submission, and order retrieval validation: 
    - [order-checkout-flow.jmx](tests/nft/load-testing/jmeter/order-checkout-flow.jmx) 
    - [run-order-load.sh](tests/nft/load-testing/scripts/run-order-load.sh) 
- **Product detail flow** for viewing details of a single product:
    - [product-detail-flow.jmx](tests/nft/load-testing/jmeter/product-detail-flow.jmx)
    - [run-product-detail-load.sh](tests/nft/load-testing/scripts/run-product-detail-load.sh)

The purpose of load testing was to simulate expected day-to-day traffic, measure response time, throughput, and error rate, and identify bottlenecks under concurrent usage. Two independent load-testing profiles were defined so the results could be interpreted from both a controlled benchmark view and a realistic funnel-based view.

The first profile is a uniform baseline of 100 users per flow. This profile is useful for comparing flows under the same concurrency level and for exposing relative performance differences without traffic-distribution bias. The second profile reflects expected day-to-day usage based on the e-commerce funnel and assigns different load levels to each flow:

| Flow | Profile 1: Uniform Baseline | Profile 2: Funnel-Based Expected Load |
| --- | ---: | ---: |
| Product Browsing | 100 | 100 |
| Product Detail | 100 | 60 |
| Search & Filter | 100 | 40 |
| Authentication | 100 | 15 |
| Order Checkout | 100 | 5 |

The funnel-based profile is justified by typical conversion behavior: browsing sits at the top of the funnel, search and product detail are used by a smaller subset of visitors, authentication is a low-frequency session action, and checkout is the smallest but most critical transaction stage. 

Each flow is tested independently under its selected load profile, with a 60-second ramp-up, 3 iterations per user, and a 900-second maximum duration. Each `.jmx` file defines a JMeter test plan for one flow. Each matching `.sh` script runs the test plan with its configured load profile and exports JTL and HTML report outputs. I also added `run-all-load.sh` to execute all flows in sequence and `analyze-jtl.mjs` to summarize response time, throughput, and error rate from the generated JTL files. The analyzer applies the flow thresholds based on the generated JTL filename, so each runner output is checked against the correct browsing, product detail, search & filter, authentication, or order & payment limits.


### Wong Sheen Kerr (A0269647J)

I am in charge of the unit testing for the authentication module across both the backend and frontend, namely:

**Server Files:**

- `helpers/authHelper.js` (2 functions: `hashPassword`, `comparePassword`)
- `middlewares/authMiddleware.js` (2 functions: `requireSignIn`, `isAdmin`)
- `controllers/authController.js` – Auth functions only:
    - `registerController`
    - `loginController`
    - `forgotPasswordController`
    - `testController`

**Client Files:**

- `context/auth.js`
- `components/Routes/Private.js`
- `components/Routes/AdminRoute.js`
- `pages/Auth/Register.js`
- `pages/Auth/Login.js`
- `pages/Auth/ForgotPassword.js` – New file I added

#### Milestone 1 Unit Test

For **milestone 1**, I have done unit test for all components under Authentication (_more information can be seen in the MS1 report_).

## 7. MS1 CI URL

**CI URL**: https://github.com/cs4218/cs4218-2520-ecom-project-c24218-2520-team01/actions/runs/22282001657
